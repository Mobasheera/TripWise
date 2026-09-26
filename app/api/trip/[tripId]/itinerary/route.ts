import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ItineraryInput = {
  id?: string;
  title?: unknown;
  item_date?: unknown;
  location?: unknown;
  type?: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function getSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server components may not always allow cookie writes.
          }
        },
      },
    }
  );
}

async function getAuthenticatedSupabase(tripId: string) {
  const supabase = await getSupabase();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message);
  }

  if (!user) {
    throw new Error("Please sign in before managing this itinerary.");
  }

  const { data: member, error: memberError } = await supabase
    .from("trip_members")
    .select("id")
    .eq("trip_id", tripId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    throw new Error(memberError.message);
  }

  if (!member) {
    throw new Error("You are not a member of this trip.");
  }

  return supabase;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return false;

  const [year, month, day] = value.split("-").map(Number);

  return (
    date.getFullYear() === year &&
    date.getMonth() + 1 === month &&
    date.getDate() === day
  );
}

function cleanItem(body: ItineraryInput) {
  const title = String(body?.title ?? "").trim();
  const item_date = String(body?.item_date ?? "").trim();
  const location = String(body?.location ?? "").trim();
  const type = String(body?.type ?? "other").trim().toLowerCase() || "other";

  if (!title) {
    throw new Error("Itinerary title is required.");
  }

  if (title.length > 500) {
    throw new Error("Itinerary title is too long.");
  }

  if (!isValidDate(item_date)) {
    throw new Error("Please provide a valid itinerary date.");
  }

  if (location.length > 500) {
    throw new Error("Location is too long.");
  }

  if (type.length > 100) {
    throw new Error("Itinerary type is too long.");
  }

  return {
    title,
    item_date,
    location: location || null,
    type,
  };
}

async function parseJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new Error("Request body must contain valid JSON.");
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    if (!tripId) {
      return jsonError("Trip ID is required.");
    }

    const supabase = await getAuthenticatedSupabase(tripId);

    const { data, error } = await supabase
      .from("itinerary_items")
      .select("id, trip_id, title, item_date, location, type")
      .eq("trip_id", tripId)
      .order("item_date", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("ITINERARY GET DB ERROR:", error);
      return jsonError(error.message, 500);
    }

    return NextResponse.json({
      items: Array.isArray(data) ? data : [],
    });
  } catch (error) {
    console.error("ITINERARY GET ERROR:", error);

    return jsonError(
      error instanceof Error ? error.message : "Unable to load itinerary.",
      500
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    if (!tripId) {
      return jsonError("Trip ID is required.");
    }

    const supabase = await getAuthenticatedSupabase(tripId);
    const body = await parseJson(request);

    const rawItems: ItineraryInput[] = Array.isArray(body?.items)
      ? body.items
      : [body];

    if (!rawItems.length) {
      return jsonError("No itinerary items supplied.");
    }

    if (rawItems.length > 100) {
      return jsonError("You can add at most 100 itinerary items at once.");
    }

    const cleanedItems = rawItems.map((item: ItineraryInput) =>
      cleanItem(item)
    );

    const rows = cleanedItems.map((item) => ({
      trip_id: tripId,
      title: item.title,
      item_date: item.item_date,
      location: item.location,
      type: item.type,
    }));

    const { data, error } = await supabase
      .from("itinerary_items")
      .insert(rows)
      .select("id, trip_id, title, item_date, location, type");

    if (error) {
      console.error("ITINERARY POST DB ERROR:", error);
      return jsonError(error.message, 500);
    }

    return NextResponse.json({
      items: Array.isArray(data) ? data : [],
    });
  } catch (error) {
    console.error("ITINERARY POST ERROR:", error);

    return jsonError(
      error instanceof Error ? error.message : "Unable to save itinerary.",
      500
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    if (!tripId) {
      return jsonError("Trip ID is required.");
    }

    const supabase = await getAuthenticatedSupabase(tripId);
    const body = await parseJson(request);

    const id = String(body?.id ?? "").trim();

    if (!id) {
      return jsonError("Itinerary item ID is required.");
    }

    const item = cleanItem(body);

    const { data, error } = await supabase
      .from("itinerary_items")
      .update({
        title: item.title,
        item_date: item.item_date,
        location: item.location,
        type: item.type,
      })
      .eq("id", id)
      .eq("trip_id", tripId)
      .select("id, trip_id, title, item_date, location, type")
      .maybeSingle();

    if (error) {
      console.error("ITINERARY PATCH DB ERROR:", error);
      return jsonError(error.message, 500);
    }

    if (!data) {
      return jsonError("Itinerary item was not found.", 404);
    }

    return NextResponse.json({ item: data });
  } catch (error) {
    console.error("ITINERARY PATCH ERROR:", error);

    return jsonError(
      error instanceof Error ? error.message : "Unable to update itinerary.",
      500
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    if (!tripId) {
      return jsonError("Trip ID is required.");
    }

    const supabase = await getAuthenticatedSupabase(tripId);
    const id = request.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
      return jsonError("Itinerary item ID is required.");
    }

    const { data, error } = await supabase
      .from("itinerary_items")
      .delete()
      .eq("id", id)
      .eq("trip_id", tripId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("ITINERARY DELETE DB ERROR:", error);
      return jsonError(error.message, 500);
    }

    if (!data) {
      return jsonError("Itinerary item was not found.", 404);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ITINERARY DELETE ERROR:", error);

    return jsonError(
      error instanceof Error ? error.message : "Unable to delete itinerary.",
      500
    );
  }
}
