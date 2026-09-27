// import { NextResponse } from "next/server";

// export async function POST(request: Request) {
//   const body = await request.json();
//   return NextResponse.json({ message: "Bill endpoint ready", bill: body }, { status: 201 });
// }
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

export async function GET(
  request: Request
) {
  try {
    const url =
      new URL(request.url);

    const tripId =
      url.searchParams.get(
        "tripId"
      );

    if (!tripId) {
      return NextResponse.json(
        {
          error:
            "tripId is required.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await getSupabaseServer();

    const {
      data: { user },
    } =
      await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Please sign in.",
        },
        { status: 401 }
      );
    }

    const {
      data: membership,
    } =
      await supabase
        .from("trip_members")
        .select("id")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (!membership) {
      return NextResponse.json(
        {
          error:
            "You are not a member of this trip.",
        },
        { status: 403 }
      );
    }

    const {
      data: bills,
      error: billsError,
    } =
      await supabase
        .from("bills")
        .select(
          `
          id,
          trip_id,
          merchant,
          subtotal,
          tax,
          total,
          scan_status,
          created_at
          `
        )
        .eq(
          "trip_id",
          tripId
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

    if (billsError) {
      throw billsError;
    }

    const billIds =
      (bills || []).map(
        (bill) => bill.id
      );

    let items: any[] = [];

    if (billIds.length) {
      const {
        data,
        error,
      } =
        await supabase
          .from("bill_items")
          .select(
            `
            id,
            bill_id,
            name,
            quantity,
            price
            `
          )
          .in(
            "bill_id",
            billIds
          );

      if (error) {
        throw error;
      }

      items = data || [];
    }

    return NextResponse.json({
      bills:
        (bills || []).map(
          (bill) => ({
            ...bill,
            subtotal:
              Number(
                bill.subtotal || 0
              ),
            tax:
              Number(
                bill.tax || 0
              ),
            total:
              Number(
                bill.total || 0
              ),
            items:
              items
                .filter(
                  (item) =>
                    item.bill_id ===
                    bill.id
                )
                .map(
                  (item) => ({
                    ...item,
                    quantity:
                      Number(
                        item.quantity ||
                          1
                      ),
                    price:
                      Number(
                        item.price ||
                          0
                      ),
                  })
                ),
          })
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/bills error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to load bills.",
      },
      { status: 500 }
    );
  }
}