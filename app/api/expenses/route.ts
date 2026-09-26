import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type ExpenseMember = {
  id: string;
  name: string | null;
  email: string | null;
  upi_id: string | null;
};

function getSupabaseServerClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  return createServerClient(supabaseUrl, supabaseKey, {
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
          // Safe to ignore when cookies cannot be modified
          // from the current server context.
        }
      },
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

async function getAuthenticatedUser(
  supabase: ReturnType<typeof getSupabaseServerClient>
) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

async function verifyTripMember(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  tripId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from("trip_members")
    .select("id, trip_id, user_id, role")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

/* -------------------------------------------------------------------------- */
/* GET                                                                        */
/* /api/expenses?tripId=...                                                   */
/* -------------------------------------------------------------------------- */

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get("tripId");

    if (!tripId) {
      return NextResponse.json(
        {
          error: "tripId is required.",
        },
        { status: 400 }
      );
    }

    const membership = await verifyTripMember(
      supabase,
      tripId,
      user.id
    );

    if (!membership) {
      return NextResponse.json(
        {
          error: "You are not a member of this trip.",
        },
        { status: 403 }
      );
    }

    const { data: expenses, error: expensesError } = await supabase
      .from("expenses")
      .select(
        `
        id,
        trip_id,
        title,
        amount,
        category,
        expense_date,
        created_at,
        paid_by
        `
      )
      .eq("trip_id", tripId)
      .order("created_at", { ascending: false });

    if (expensesError) {
      throw expensesError;
    }

    const { data: memberRows, error: membersError } = await supabase
      .from("trip_members")
      .select(
        `
        user_id,
        role,
        profiles (
          id,
          name,
          email,
          upi_id
        )
        `
      )
      .eq("trip_id", tripId);

    if (membersError) {
      throw membersError;
    }

    const members: ExpenseMember[] = (memberRows ?? [])
      .map((row: any) => {
        const profile = Array.isArray(row.profiles)
          ? row.profiles[0]
          : row.profiles;

        if (!profile?.id) {
          return null;
        }

        return {
          id: profile.id,
          name: profile.name ?? null,
          email: profile.email ?? null,
          upi_id: profile.upi_id ?? null,
        };
      })
      .filter(Boolean) as ExpenseMember[];

    const expenseIds = (expenses ?? []).map(
      (expense) => expense.id
    );

    let splits: any[] = [];

    if (expenseIds.length > 0) {
      const { data: splitRows, error: splitsError } =
        await supabase
          .from("expense_splits")
          .select(
            `
            id,
            expense_id,
            participant_id,
            split_type,
            amount
            `
          )
          .in("expense_id", expenseIds);

      if (splitsError) {
        throw splitsError;
      }

      splits = splitRows ?? [];
    }

    return NextResponse.json({
      expenses: expenses ?? [],
      members,
      splits,
    });
  } catch (error: any) {
    console.error("GET /api/expenses error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to load expenses.",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* POST                                                                       */
/* /api/expenses                                                              */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      tripId,
      title,
      amount,
      category,
      expenseDate,
      paidBy,
      participantIds,
    } = body;

    /* ---------------------------------------------------------------------- */
    /* Validate                                                               */
    /* ---------------------------------------------------------------------- */

    if (!tripId) {
      return NextResponse.json(
        {
          error: "tripId is required.",
        },
        { status: 400 }
      );
    }

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        {
          error: "Expense title is required.",
        },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return NextResponse.json(
        {
          error: "Expense amount must be greater than zero.",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Verify current user belongs to THIS trip                              */
    /* ---------------------------------------------------------------------- */

    const membership = await verifyTripMember(
      supabase,
      tripId,
      user.id
    );

    if (!membership) {
      return NextResponse.json(
        {
          error: "You are not a member of this trip.",
        },
        { status: 403 }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Load THIS trip's members                                               */
    /* ---------------------------------------------------------------------- */

    const { data: memberRows, error: membersError } = await supabase
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", tripId);

    if (membersError) {
      throw membersError;
    }

    const tripMemberIds = Array.from(
      new Set(
        (memberRows ?? [])
          .map((member) => member.user_id)
          .filter(Boolean)
      )
    );

    if (tripMemberIds.length === 0) {
      return NextResponse.json(
        {
          error: "This trip has no participants yet.",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Payer                                                                  */
    /* ---------------------------------------------------------------------- */

    const payerId = paidBy || user.id;

    if (!tripMemberIds.includes(payerId)) {
      return NextResponse.json(
        {
          error: "The selected payer is not a member of this trip.",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Participants                                                           */
    /* ---------------------------------------------------------------------- */

    let selectedParticipantIds: string[] = Array.isArray(participantIds)
      ? participantIds
          .filter(Boolean)
          .map(String)
      : [];

    /*
     * If no participants were selected,
     * split equally across ALL members of THIS trip.
     */
    if (selectedParticipantIds.length === 0) {
      selectedParticipantIds = [...tripMemberIds];
    }

    selectedParticipantIds = Array.from(
      new Set(selectedParticipantIds)
    );

    const invalidParticipant = selectedParticipantIds.find(
      (participantId) =>
        !tripMemberIds.includes(participantId)
    );

    if (invalidParticipant) {
      return NextResponse.json(
        {
          error:
            "One or more selected participants do not belong to this trip.",
        },
        { status: 400 }
      );
    }

    /* ---------------------------------------------------------------------- */
    /* Insert expense                                                         */
    /* ---------------------------------------------------------------------- */

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        trip_id: tripId,
        title: String(title).trim(),
        amount: numericAmount,
        category: category || "Other",
        expense_date:
          expenseDate ||
          new Date().toISOString().slice(0, 10),
        paid_by: payerId,
      })
      .select(
        `
        id,
        trip_id,
        title,
        amount,
        category,
        expense_date,
        created_at,
        paid_by
        `
      )
      .single();

    if (expenseError) {
      throw expenseError;
    }

    /* ---------------------------------------------------------------------- */
    /* Calculate equal split accurately to 2 decimal places                  */
    /* ---------------------------------------------------------------------- */

    const participantCount =
      selectedParticipantIds.length;

    const totalPaise = Math.round(
      numericAmount * 100
    );

    const basePaise = Math.floor(
      totalPaise / participantCount
    );

    const remainderPaise =
      totalPaise -
      basePaise * participantCount;

    const splitRows = selectedParticipantIds.map(
      (participantId, index) => {
        const paise =
          basePaise +
          (index < remainderPaise ? 1 : 0);

        return {
          expense_id: expense.id,
          participant_id: participantId,
          split_type: "equal",
          amount: paise / 100,
        };
      }
    );

    /* ---------------------------------------------------------------------- */
    /* Insert splits                                                          */
    /* ---------------------------------------------------------------------- */

    const { data: splits, error: splitsError } =
      await supabase
        .from("expense_splits")
        .insert(splitRows)
        .select(
          `
          id,
          expense_id,
          participant_id,
          split_type,
          amount
          `
        );

    if (splitsError) {
      /*
       * Roll back manually because this is two inserts
       * rather than a database transaction.
       */
      await supabase
        .from("expenses")
        .delete()
        .eq("id", expense.id)
        .eq("trip_id", tripId);

      throw splitsError;
    }

    return NextResponse.json(
      {
        success: true,
        expense,
        splits: splits ?? [],
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/expenses error:", error);

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to create expense.",
      },
      { status: 500 }
    );
  }
}

/* -------------------------------------------------------------------------- */
/* DELETE                                                                     */
/* /api/expenses?id=...&tripId=...                                            */
/* -------------------------------------------------------------------------- */

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = getSupabaseServerClient(cookieStore);

    const user = await getAuthenticatedUser(supabase);

    if (!user) {
      return NextResponse.json(
        {
          error: "You must be signed in.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);

    const expenseId = searchParams.get("id");
    const tripId = searchParams.get("tripId");

    if (!expenseId || !tripId) {
      return NextResponse.json(
        {
          error: "Expense id and tripId are required.",
        },
        { status: 400 }
      );
    }

    const membership = await verifyTripMember(
      supabase,
      tripId,
      user.id
    );

    if (!membership) {
      return NextResponse.json(
        {
          error: "You are not a member of this trip.",
        },
        { status: 403 }
      );
    }

    const { data: expense, error: findError } =
      await supabase
        .from("expenses")
        .select("id, trip_id")
        .eq("id", expenseId)
        .eq("trip_id", tripId)
        .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (!expense) {
      return NextResponse.json(
        {
          error:
            "Expense was not found in this trip.",
        },
        { status: 404 }
      );
    }

    const { error: deleteError } =
      await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId)
        .eq("trip_id", tripId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json({
      success: true,
      deletedId: expenseId,
    });
  } catch (error: any) {
    console.error(
      "DELETE /api/expenses error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "Unable to delete expense.",
      },
      { status: 500 }
    );
  }
}