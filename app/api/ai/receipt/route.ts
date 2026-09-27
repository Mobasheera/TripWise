import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const AI_BACKEND_URL =
  process.env.AI_BACKEND_URL || "http://localhost:8000";

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
                cookieStore.set(name, value, options);
              }
            );
          } catch {
            // Ignore cookie write errors in route handlers.
          }
        },
      },
    }
  );
}

/**
 * Server-only Supabase client.
 *
 * IMPORTANT:
 * This client bypasses RLS.
 * Never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is missing."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local."
    );
  }

  return createClient(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const imageDataUrl = String(
      body?.imageDataUrl || ""
    );

    const tripId = String(
      body?.tripId || ""
    );

    // --------------------------------------------------
    // Validate image
    // --------------------------------------------------

    if (!imageDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        {
          error:
            "Please upload a valid receipt image.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Validate trip
    // --------------------------------------------------

    if (!tripId) {
      return NextResponse.json(
        {
          error:
            "Open the AI inside a trip before uploading a receipt.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Authenticated Supabase client
    // Used ONLY for authentication + permission check
    // --------------------------------------------------

    const supabase =
      await getSupabaseServer();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Please sign in to scan a receipt.",
        },
        { status: 401 }
      );
    }

    // --------------------------------------------------
    // Check that the logged-in user has access
    // to this trip
    // --------------------------------------------------

    const [
      ownedResult,
      memberResult,
    ] = await Promise.all([
      supabase
        .from("trips")
        .select("id")
        .eq("id", tripId)
        .eq("created_by", user.id)
        .maybeSingle(),

      supabase
        .from("trip_members")
        .select("trip_id")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (ownedResult.error) {
      throw ownedResult.error;
    }

    if (memberResult.error) {
      throw memberResult.error;
    }

    if (
      !ownedResult.data &&
      !memberResult.data
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have access to this trip.",
        },
        { status: 403 }
      );
    }

    // --------------------------------------------------
    // Send receipt to Groq backend
    // --------------------------------------------------

    const backendResponse =
      await fetch(
        `${AI_BACKEND_URL}/api/receipt`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            image_data_url:
              imageDataUrl,

            trip_id: tripId,
          }),

          cache: "no-store",
        }
      );

    let backendResult: any;

    try {
      backendResult =
        await backendResponse.json();
    } catch {
      backendResult = null;
    }

    if (!backendResponse.ok) {
      return NextResponse.json(
        {
          error:
            backendResult?.detail ||
            backendResult?.error ||
            "Receipt OCR failed.",
        },
        {
          status:
            backendResponse.status || 500,
        }
      );
    }

    const receipt =
      backendResult?.receipt;

    if (!receipt) {
      return NextResponse.json(
        {
          error:
            "Groq processed the receipt but returned no receipt data.",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // IMPORTANT:
    // Use service-role client for database writes.
    // This bypasses RLS AFTER we already verified
    // the logged-in user has access to the trip.
    // --------------------------------------------------

    const admin =
      getSupabaseAdmin();

    // --------------------------------------------------
    // Insert bill
    // --------------------------------------------------

    const {
      data: bill,
      error: billError,
    } = await admin
      .from("bills")
      .insert({
        trip_id: tripId,

        image_url: null,

        merchant:
          receipt.merchant ||
          null,

        subtotal:
          Number(
            receipt.subtotal || 0
          ),

        tax:
          Number(
            receipt.tax_total || 0
          ),

        total:
          Number(
            receipt.total || 0
          ),

        scan_status:
          "completed",
      })
      .select("id")
      .single();

    if (billError) {
      console.error(
        "Bill insert error:",
        billError
      );

      throw new Error(
        `Failed to save receipt: ${billError.message}`
      );
    }

    // --------------------------------------------------
    // Insert receipt items
    // --------------------------------------------------

    const receiptItems =
      Array.isArray(receipt.items)
        ? receipt.items
        : [];

    const itemRows =
      receiptItems.map(
        (item: any) => ({
          bill_id: bill.id,

          name:
            String(
              item.name || ""
            ).trim(),

          quantity:
            Number(
              item.quantity || 1
            ),

          price:
            Number(
              item.line_total ??
                item.total ??
                0
            ),
        })
      );

    let insertedItems: any[] =
      [];

    if (itemRows.length > 0) {
      const {
        data,
        error: itemsError,
      } = await admin
        .from("bill_items")
        .insert(itemRows)
        .select(
          "id, name, quantity, price"
        );

      if (itemsError) {
        console.error(
          "Bill items insert error:",
          itemsError
        );

        // Remove the bill if item insertion
        // failed so we don't leave a broken
        // receipt in the database.
        await admin
          .from("bills")
          .delete()
          .eq(
            "id",
            bill.id
          );

        throw new Error(
          `Failed to save receipt items: ${itemsError.message}`
        );
      }

      insertedItems =
        data || [];
    }

    // --------------------------------------------------
    // Build final receipt response
    // --------------------------------------------------

    const finalReceipt = {
      ...receipt,

      bill_id:
        bill.id,

      items:
        receiptItems.map(
          (
            item: any,
            index: number
          ) => ({
            ...item,

            database_item_id:
              insertedItems[
                index
              ]?.id || null,
          })
        ),
    };

    return NextResponse.json({
      success: true,

      receipt:
        finalReceipt,
    });
  } catch (error) {
    console.error(
      "Receipt upload error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process receipt.",
      },
      { status: 500 }
    );
  }
}