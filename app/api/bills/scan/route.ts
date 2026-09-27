import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { GoogleGenerativeAI } from "@google/generative-ai";

async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {}
        },
      },
    }
  );
}

type ParsedReceipt = {
  merchant: string | null;
  subtotal: number;
  tax: number;
  total: number;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
};

export async function POST(
  request: Request
) {
  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    const tripId =
      String(
        formData.get("tripId") || ""
      );

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "Receipt image is required.",
        },
        { status: 400 }
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error:
            "Only receipt images are supported.",
        },
        { status: 400 }
      );
    }

    if (!tripId) {
      return NextResponse.json(
        {
          error:
            "Trip ID is required.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await getSupabaseServer();

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Please sign in first.",
        },
        { status: 401 }
      );
    }

    /*
     * Verify trip membership.
     */
    const {
      data: membership,
      error: membershipError,
    } = await supabase
      .from("trip_members")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (
      membershipError ||
      !membership
    ) {
      return NextResponse.json(
        {
          error:
            "You are not a member of this trip.",
        },
        { status: 403 }
      );
    }

    const bytes =
      await file.arrayBuffer();

    const base64 =
      Buffer.from(bytes).toString(
        "base64"
      );

    const genAI =
      new GoogleGenerativeAI(
        process.env.GEMINI_API_KEY!
      );

    const model =
      genAI.getGenerativeModel({
        model:
          process.env.GEMINI_RECEIPT_MODEL ||
          "gemini-2.0-flash",
        generationConfig: {
          responseMimeType:
            "application/json",
        },
      });

    const prompt = `
Analyze this receipt image.

Perform OCR first.

Extract all visible receipt information.

Return ONLY valid JSON in this exact structure:

{
  "merchant": "string or null",
  "subtotal": 0,
  "tax": 0,
  "total": 0,
  "items": [
    {
      "name": "string",
      "quantity": 1,
      "price": 0
    }
  ]
}

Rules:

- Recognize all readable text.
- Include every purchased item.
- Do not include payment method as an item.
- Do not include discounts as items.
- "price" is the total price for that line item.
- If quantity is not visible, use 1.
- Use numbers, not currency symbols.
- If subtotal is not visible, calculate it from the items.
- If tax is not visible, use 0.
- If total is not visible, calculate subtotal + tax.
- Preserve the item names as accurately as possible.
- Do not invent unreadable values.
`;

    const result =
      await model.generateContent([
        {
          inlineData: {
            data: base64,
            mimeType: file.type,
          },
        },
        prompt,
      ]);

    const raw =
      result.response.text();

    const cleaned =
      raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    let parsed: ParsedReceipt;

    try {
      parsed =
        JSON.parse(cleaned);
    } catch {
      throw new Error(
        "The AI could not return a valid receipt structure."
      );
    }

    if (
      !Array.isArray(
        parsed.items
      )
    ) {
      throw new Error(
        "No receipt items were detected."
      );
    }

    const items =
      parsed.items
        .filter(
          (item) =>
            item?.name &&
            Number.isFinite(
              Number(item.price)
            )
        )
        .map((item) => ({
          name: String(
            item.name
          ).trim(),
          quantity:
            Number(item.quantity) ||
            1,
          price:
            Number(item.price) || 0,
        }));

    if (!items.length) {
      throw new Error(
        "No readable receipt items were found."
      );
    }

    const subtotal = Number(
      parsed.subtotal ||
        items.reduce(
          (sum, item) =>
            sum +
            item.price,
          0
        )
    );

    const tax = Number(
      parsed.tax || 0
    );

    const total = Number(
      parsed.total ||
        subtotal + tax
    );

    /*
     * Create bill.
     */
    const {
      data: bill,
      error: billError,
    } = await supabase
      .from("bills")
      .insert({
        trip_id: tripId,
        merchant:
          parsed.merchant ||
          null,
        subtotal,
        tax,
        total,
        scan_status: "completed",
      })
      .select(
        "id, trip_id, merchant, subtotal, tax, total, scan_status"
      )
      .single();

    if (billError) {
      throw billError;
    }

    /*
     * Create bill items.
     */
    const {
      data: billItems,
      error: itemsError,
    } =
      await supabase
        .from("bill_items")
        .insert(
          items.map(
            (item) => ({
              bill_id: bill.id,
              name: item.name,
              quantity:
                item.quantity,
              price: item.price,
            })
          )
        )
        .select(
          "id, bill_id, name, quantity, price"
        );

    if (itemsError) {
      await supabase
        .from("bills")
        .delete()
        .eq("id", bill.id);

      throw itemsError;
    }

    return NextResponse.json({
      success: true,
      receipt: {
        id: bill.id,
        merchant: bill.merchant,
        subtotal: Number(
          bill.subtotal || 0
        ),
        tax: Number(
          bill.tax || 0
        ),
        total: Number(
          bill.total || 0
        ),
        items:
          billItems?.map(
            (item) => ({
              id: item.id,
              name: item.name,
              quantity: Number(
                item.quantity
              ),
              price: Number(
                item.price
              ),
            })
          ) || [],
      },
    });
  } catch (error) {
    console.error(
      "Receipt OCR error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to scan receipt.",
      },
      { status: 500 }
    );
  }
}