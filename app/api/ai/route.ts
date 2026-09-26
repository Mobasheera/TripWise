import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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
                cookieStore.set(
                  name,
                  value,
                  options
                );
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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const question = String(
      body?.question || ""
    ).trim();

    const history = Array.isArray(body?.history)
      ? body.history
      : [];

    const requestedTripId =
      body?.tripId
        ? String(body.tripId)
        : null;

    if (!question) {
      return NextResponse.json(
        {
          error: "Question is required.",
        },
        { status: 400 }
      );
    }

    const supabase =
      await getSupabaseServer();

    /*
     * ============================================================
     * AUTHENTICATION
     * ============================================================
     */

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          error:
            "Please sign in to use TripWise AI.",
        },
        { status: 401 }
      );
    }

    /*
     * user.id is the REAL Supabase UUID.
     *
     * We never trust a UUID sent by the browser.
     */

    const userId = user.id;

    /*
     * ============================================================
     * FIND ALL TRIPS BELONGING TO THIS USER
     * ============================================================
     */

    const [
      ownedTripsResult,
      memberTripsResult,
    ] = await Promise.all([
      supabase
        .from("trips")
        .select(
          `
          id,
          name,
          destination,
          start_date,
          end_date,
          created_by,
          created_at
          `
        )
        .eq("created_by", userId),

      supabase
        .from("trip_members")
        .select("trip_id")
        .eq("user_id", userId),
    ]);

    if (ownedTripsResult.error) {
      throw ownedTripsResult.error;
    }

    if (memberTripsResult.error) {
      throw memberTripsResult.error;
    }

    const ownedTrips =
      ownedTripsResult.data || [];

    const memberTripIds =
      (memberTripsResult.data || [])
        .map((row) => row.trip_id)
        .filter(Boolean);

    const allTripIds = Array.from(
      new Set([
        ...ownedTrips.map(
          (trip) => trip.id
        ),
        ...memberTripIds,
      ])
    );

    let trips = [...ownedTrips];

    /*
     * Fetch trips where user is a member.
     */

    if (memberTripIds.length > 0) {
      const {
        data: memberTrips,
        error,
      } = await supabase
        .from("trips")
        .select(
          `
          id,
          name,
          destination,
          start_date,
          end_date,
          created_by,
          created_at
          `
        )
        .in("id", memberTripIds);

      if (error) {
        throw error;
      }

      trips = [
        ...trips,
        ...(memberTrips || []),
      ];
    }

    /*
     * Remove duplicate trips.
     */

    trips = Array.from(
      new Map(
        trips.map((trip) => [
          trip.id,
          trip,
        ])
      ).values()
    );

    /*
     * ============================================================
     * SELECT CURRENT TRIP
     * ============================================================
     *
     * If the user is currently inside:
     *
     * /trip/<tripId>/...
     *
     * then AI focuses on that trip.
     *
     * Otherwise AI can use all trips belonging
     * to the logged-in user.
     */

    let selectedTripId: string | null =
      null;

    if (
      requestedTripId &&
      allTripIds.includes(
        requestedTripId
      )
    ) {
      selectedTripId =
        requestedTripId;
    }

    const queryTripIds =
      selectedTripId
        ? [selectedTripId]
        : allTripIds;

    /*
     * ============================================================
     * NO TRIPS
     * ============================================================
     */

    if (queryTripIds.length === 0) {
      return await callAIBackend({
        question,
        history,
        context: {
          user: {
            id: userId,
            name:
              user.user_metadata
                ?.full_name ||
              user.user_metadata
                ?.name ||
              null,
            email:
              user.email || null,
          },
          trips: [],
          selected_trip_id: null,
          message:
            "The authenticated user has no trips yet.",
        },
      });
    }

    /*
     * ============================================================
     * FETCH ALL TRIP DATA
     * ============================================================
     */

    const [
      membersResult,
      expensesResult,
      splitsResult,
      bookingsResult,
      billsResult,
      billItemsResult,
      itemParticipantsResult,
      paymentsResult,
      itineraryResult,
    ] = await Promise.all([
      supabase
        .from("trip_members")
        .select(
          `
          id,
          trip_id,
          user_id,
          role,
          profiles (
            id,
            name,
            email,
            avatar_url,
            upi_id
          )
          `
        )
        .in(
          "trip_id",
          queryTripIds
        ),

      supabase
        .from("expenses")
        .select(
          `
          id,
          trip_id,
          title,
          amount,
          paid_by,
          category,
          expense_date,
          created_at
          `
        )
        .in(
          "trip_id",
          queryTripIds
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("expense_splits")
        .select(
          `
          id,
          expense_id,
          participant_id,
          split_type,
          amount
          `
        ),

      supabase
        .from("bookings")
        .select(
          `
          id,
          trip_id,
          title,
          type,
          vendor,
          amount,
          paid_by,
          booking_date,
          status
          `
        )
        .in(
          "trip_id",
          queryTripIds
        )
        .order("booking_date", {
          ascending: true,
        }),

      supabase
        .from("bills")
        .select(
          `
          id,
          trip_id,
          image_url,
          merchant,
          subtotal,
          tax,
          total,
          scan_status,
          created_at
          `
        )
        .in(
          "trip_id",
          queryTripIds
        ),

      supabase
        .from("bill_items")
        .select(
          `
          id,
          bill_id,
          name,
          quantity,
          price
          `
        ),

      supabase
        .from("item_participants")
        .select(
          `
          id,
          item_id,
          participant_id,
          share,
          amount
          `
        ),

      supabase
        .from("payments")
        .select(
          `
          id,
          trip_id,
          payer_id,
          receiver_id,
          amount,
          status,
          created_at,
          completed_at
          `
        )
        .in(
          "trip_id",
          queryTripIds
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("itinerary_items")
        .select(
          `
          id,
          trip_id,
          title,
          item_date,
          location,
          type
          `
        )
        .in(
          "trip_id",
          queryTripIds
        )
        .order("item_date", {
          ascending: true,
        }),
    ]);

    const results = [
      membersResult,
      expensesResult,
      splitsResult,
      bookingsResult,
      billsResult,
      billItemsResult,
      itemParticipantsResult,
      paymentsResult,
      itineraryResult,
    ];

    for (const result of results) {
      if (result.error) {
        throw result.error;
      }
    }

    /*
     * IMPORTANT:
     * expense_splits, bill_items and item_participants
     * don't contain trip_id directly.
     *
     * Filter them through the already-loaded parent records.
     */

    const expenseIds = new Set(
      (expensesResult.data || []).map(
        (expense) => expense.id
      )
    );

    const billIds = new Set(
      (billsResult.data || []).map(
        (bill) => bill.id
      )
    );

    const billItemIds = new Set(
      (billItemsResult.data || [])
        .filter((item) =>
          billIds.has(item.bill_id)
        )
        .map((item) => item.id)
    );

    const filteredSplits =
      (splitsResult.data || []).filter(
        (split) =>
          expenseIds.has(
            split.expense_id
          )
      );

    const filteredBillItems =
      (billItemsResult.data || []).filter(
        (item) =>
          billIds.has(item.bill_id)
      );

    const filteredItemParticipants =
      (itemParticipantsResult.data || []).filter(
        (item) =>
          billItemIds.has(item.item_id)
      );

    /*
     * ============================================================
     * BUILD AI CONTEXT
     * ============================================================
     */

    const context = {
      user: {
        id: userId,
        name:
          user.user_metadata
            ?.full_name ||
          user.user_metadata
            ?.name ||
          null,
        email:
          user.email || null,
      },

      selected_trip_id:
        selectedTripId,

      trips,

      members:
        membersResult.data || [],

      expenses:
        expensesResult.data || [],

      expense_splits:
        filteredSplits,

      bookings:
        bookingsResult.data || [],

      bills:
        billsResult.data || [],

      bill_items:
        filteredBillItems,

      item_participants:
        filteredItemParticipants,

      payments:
        paymentsResult.data || [],

      itinerary:
        itineraryResult.data || [],
    };

    /*
     * ============================================================
     * SEND VERIFIED DATA TO AI BACKEND
     * ============================================================
     */

    return await callAIBackend({
      question,
      history,
      context,
    });
  } catch (error) {
    console.error(
      "TripWise AI error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to process AI request.",
      },
      { status: 500 }
    );
  }
}

/*
 * ================================================================
 * FASTAPI CALL
 * ================================================================
 */

async function callAIBackend(payload: {
  question: string;
  history: any[];
  context: any;
}) {
  const response = await fetch(
    `${AI_BACKEND_URL}/api/analyze`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(payload),

      cache: "no-store",
    }
  );

  if (!response.ok) {
  const errorText = await response.text();

  console.error(
    "AI BACKEND ERROR:",
    response.status,
    errorText
  );

  return NextResponse.json(
    {
      error:
        errorText ||
        "AI backend failed.",
    },
    { status: response.status }
  );
}
  const result =
    await response.json();

  return NextResponse.json(
    result
  );
}