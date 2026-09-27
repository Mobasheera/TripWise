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
     * BUILD COMPACT AI CONTEXT
     * ============================================================
     *
     * IMPORTANT:
     * We deliberately do NOT send the entire database to Groq.
     * This keeps the AI request below the free-tier token limit
     * while preserving the actual TripWise data in Supabase.
     */

    const compactTrips = trips.map((trip) => ({
      name: trip.name,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
    }));

    // If no trip is selected, only send trip summaries.
    // This lets the AI ask the user which trip they mean
    // instead of receiving every expense/booking from every trip.
    if (!selectedTripId) {
      const context = {
        user: {
          name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            null,
          email: user.email || null,
        },

        selected_trip_id: null,

        trips: compactTrips,

        message:
          "No specific trip is selected. Use the trip summaries above. " +
          "If the question requires trip-specific details, ask the user " +
          "which trip they mean.",
      };

      return await callAIBackend({
        question,
        history: Array.isArray(history)
          ? history.slice(-4).map((item: any) => ({
              role: item?.role,
              content: String(item?.content || "").slice(0, 1000),
            }))
          : [],
        context,
      });
    }

    /*
     * ============================================================
     * SELECTED TRIP ONLY
     * ============================================================
     */

    const selectedTrip =
      trips.find((trip) => trip.id === selectedTripId) || null;

    const selectedMembers =
      (membersResult.data || [])
        .filter((member) => member.trip_id === selectedTripId)
        .slice(0, 30)
        .map((member) => {
          const profile = Array.isArray(member.profiles)
            ? member.profiles[0]
            : member.profiles;

          return {
            name: profile?.name || "Traveler",
            email: profile?.email || null,
            role: member.role || null,
            upi_id: profile?.upi_id || null,
          };
        });

    const selectedExpenses =
      (expensesResult.data || [])
        .filter((expense) => expense.trip_id === selectedTripId)
        .slice(0, 30)
        .map((expense) => ({
          title: expense.title,
          amount: expense.amount,
          category: expense.category,
          paid_by: expense.paid_by,
          expense_date: expense.expense_date,
        }));

    const selectedExpenseIds = new Set(
      (expensesResult.data || [])
        .filter((expense) => expense.trip_id === selectedTripId)
        .map((expense) => expense.id)
    );

    const selectedSplits =
      filteredSplits
        .filter((split) => selectedExpenseIds.has(split.expense_id))
        .slice(0, 50)
        .map((split) => ({
          expense_id: split.expense_id,
          participant_id: split.participant_id,
          split_type: split.split_type,
          amount: split.amount,
        }));

    const selectedBookings =
      (bookingsResult.data || [])
        .filter((booking) => booking.trip_id === selectedTripId)
        .slice(0, 30)
        .map((booking) => ({
          title: booking.title,
          type: booking.type,
          vendor: booking.vendor,
          amount: booking.amount,
          paid_by: booking.paid_by,
          booking_date: booking.booking_date,
          status: booking.status,
        }));

    const selectedBills =
      (billsResult.data || [])
        .filter((bill) => bill.trip_id === selectedTripId)
        .slice(0, 20)
        .map((bill) => ({
          merchant: bill.merchant,
          subtotal: bill.subtotal,
          tax: bill.tax,
          total: bill.total,
          scan_status: bill.scan_status,
          created_at: bill.created_at,
        }));

    const selectedBillIds = new Set(
      (billsResult.data || [])
        .filter((bill) => bill.trip_id === selectedTripId)
        .map((bill) => bill.id)
    );

    const selectedBillItems =
      filteredBillItems
        .filter((item) => selectedBillIds.has(item.bill_id))
        .slice(0, 50)
        .map((item) => ({
          bill_id: item.bill_id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        }));

  

    const selectedPayments =
      (paymentsResult.data || [])
        .filter((payment) => payment.trip_id === selectedTripId)
        .slice(0, 50)
        .map((payment) => ({
          payer_id: payment.payer_id,
          receiver_id: payment.receiver_id,
          amount: payment.amount,
          status: payment.status,
          created_at: payment.created_at,
          completed_at: payment.completed_at,
        }));

    const selectedItinerary =
      (itineraryResult.data || [])
        .filter((item) => item.trip_id === selectedTripId)
        .slice(0, 30)
        .map((item) => ({
          title: item.title,
          item_date: item.item_date,
          location: item.location,
          type: item.type,
        }));

    const context = {
      user: {
        name:
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          null,
        email: user.email || null,
      },

      selected_trip_id: selectedTripId,

      trip: selectedTrip
        ? {
            name: selectedTrip.name,
            destination: selectedTrip.destination,
            start_date: selectedTrip.start_date,
            end_date: selectedTrip.end_date,
          }
        : null,

      members: selectedMembers,
      expenses: selectedExpenses,
      expense_splits: selectedSplits,
      bookings: selectedBookings,
      bills: selectedBills,
      bill_items: selectedBillItems,
      payments: selectedPayments,
      itinerary: selectedItinerary,
    };

    return await callAIBackend({
      question,
      history: Array.isArray(history)
        ? history.slice(-4).map((item: any) => ({
            role: item?.role,
            content: String(item?.content || "").slice(0, 1000),
          }))
        : [],
      context,
    });
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