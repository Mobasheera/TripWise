import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type ItineraryRow = {
  id: string;
  trip_id: string;
  title: string;
  item_date: string;
  location: string | null;
  type: string | null;
};

type IncomingItem = {
  title: string;
  item_date: string;
  location?: string | null;
  type?: string | null;
};

function getSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          return (await cookies()).getAll();
        },
        async setAll(cookiesToSet) {
          const cookieStore = await cookies();
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server-component cookie writes may be unavailable here.
          }
        },
      },
    }
  );
}

function cleanItem(item: IncomingItem) {
  const title = String(item.title || "").trim();
  const itemDate = String(item.item_date || "").trim();

  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(itemDate)) {
    return null;
  }

  return {
    title: title.slice(0, 500),
    item_date: itemDate,
    location: String(item.location || "").trim().slice(0, 300) || null,
    type: String(item.type || "other").trim().slice(0, 80) || "other",
  };
}

function guessType(line: string) {
  const text = line.toLowerCase();
  if (/flight|airport|drive|train|bus|departure|arrival|transfer/.test(text)) return "travel";
  if (/hotel|resort|check.?in|check.?out|stay/.test(text)) return "hotel";
  if (/breakfast|lunch|dinner|restaurant|food|cafe|bar/.test(text)) return "food";
  if (/ticket|booking|reservation/.test(text)) return "booking";
  if (/temple|museum|palace|fort|beach|sight|visit|tour|market/.test(text)) return "sightseeing";
  if (/activity|trek|hike|boating|safari|adventure/.test(text)) return "activity";
  return "other";
}

function parsePdfLines(text: string): IncomingItem[] {
  const lines = text
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3);

  const result: IncomingItem[] = [];
  let currentDate = "";
  let currentLocation = "";

  for (const line of lines) {
    const dateMatch = line.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (dateMatch) {
      currentDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, "0")}-${dateMatch[3].padStart(2, "0")}`;
    }

    const dayDateMatch = line.match(/\b(?:day\s*)?([1-9]|[12]\d|3[01])\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i);
    if (dayDateMatch && !currentDate) {
      // We intentionally do not invent a year from a PDF date without one.
      // Such rows are reviewed by the user before saving.
      currentDate = "";
    }

    const locationMatch = line.match(/(?:location|place|destination|at)\s*[:\-]\s*(.+)$/i);
    if (locationMatch) {
      currentLocation = locationMatch[1].trim();
      continue;
    }

    if (/^(itinerary|trip itinerary|travel itinerary|day\s*\d+|schedule|agenda)$/i.test(line)) {
      continue;
    }

    const structured = line.split("|").map((part) => part.trim());
    if (structured.length >= 4 && /^\d{4}-\d{2}-\d{2}$/.test(structured[0])) {
      result.push({
        item_date: structured[0],
        location: structured[1],
        type: structured[2],
        title: structured.slice(3).join(" | "),
      });
      continue;
    }

    // If a line contains a usable ISO date, remove the date from the title.
    if (currentDate) {
      const title = line.replace(/\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/, "").replace(/^[-:|]+|[-:|]+$/g, "").trim();
      if (title.length >= 3) {
        result.push({
          item_date: currentDate,
          location: currentLocation,
          type: guessType(title),
          title,
        });
      }
    }
  }

  return result.slice(0, 100);
}

async function getTripAndUser(tripId: string) {
  const supabase = getSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in before managing this itinerary.");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("You are not a member of this trip.");

  return { supabase, user };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await context.params;
    const { supabase } = await getTripAndUser(tripId);

    const { data, error } = await supabase
      .from("itinerary_items")
      .select("id, trip_id, title, item_date, location, type")
      .eq("trip_id", tripId)
      .order("item_date", { ascending: true })
      .order("id", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ items: (data || []) as ItineraryRow[] });
  } catch (error) {
    console.error("Itinerary GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load itinerary." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await context.params;
    const { supabase } = await getTripAndUser(tripId);
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "PDF file is required." }, { status: 400 });
      }

      if (file.type !== "application/pdf") {
        return NextResponse.json({ error: "Only PDF files are supported." }, { status: 400 });
      }

      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: "PDF must be 10 MB or smaller." }, { status: 400 });
      }

      const buffer = new Uint8Array(await file.arrayBuffer());
      const pdf = await getDocument({ data: buffer }).promise;
      let text = "";

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: any) => (typeof item.str === "string" ? item.str : ""))
          .join(" ");
        text += `${pageText}\n`;
      }

      const extracted = parsePdfLines(text);

      return NextResponse.json({
        text: text.trim().slice(0, 50000),
        items: extracted.map((item) => ({
          title: item.title,
          item_date: item.item_date || "",
          location: item.location || "",
          type: item.type || "other",
        })),
      });
    }

    const body = await request.json();
    const incomingItems: IncomingItem[] = Array.isArray(body.items)
      ? body.items
      : [{
          title: body.title,
          item_date: body.item_date,
          location: body.location,
          type: body.type,
        }];

    const cleaned = incomingItems
      .map(cleanItem)
      .filter(Boolean) as ReturnType<typeof cleanItem>[];

    if (!cleaned.length) {
      return NextResponse.json(
        { error: "At least one valid itinerary item is required. Dates must use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("itinerary_items")
      .insert(cleaned.map((item) => ({ ...item, trip_id: tripId })))
      .select("id, trip_id, title, item_date, location, type");

    if (error) throw error;

    return NextResponse.json({ items: data || [] });
  } catch (error) {
    console.error("Itinerary POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save itinerary." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await context.params;
    const { supabase } = await getTripAndUser(tripId);
    const body = await request.json();
    const id = String(body.id || "");

    if (!id) return NextResponse.json({ error: "Itinerary item id is required." }, { status: 400 });

    const item = cleanItem({
      title: body.title,
      item_date: body.item_date,
      location: body.location,
      type: body.type,
    });

    if (!item) return NextResponse.json({ error: "Valid title and date are required." }, { status: 400 });

    const { data, error } = await supabase
      .from("itinerary_items")
      .update(item)
      .eq("id", id)
      .eq("trip_id", tripId)
      .select("id, trip_id, title, item_date, location, type")
      .single();

    if (error) throw error;
    return NextResponse.json({ item });
  } catch (error) {
    console.error("Itinerary PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update itinerary item." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await context.params;
    const { supabase } = await getTripAndUser(tripId);
    const id = request.nextUrl.searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Itinerary item id is required." }, { status: 400 });

    const { error } = await supabase
      .from("itinerary_items")
      .delete()
      .eq("id", id)
      .eq("trip_id", tripId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Itinerary DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to delete itinerary item." },
      { status: 500 }
    );
  }
}
