import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  upi_id: string | null;
};

type Member = {
  id: string;
  trip_id: string;
  user_id: string;
  role: string | null;
  profiles?: Profile | Profile[] | null;
};

type Expense = {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  paid_by: string | null;
  category: string | null;
  expense_date: string | null;
  created_at: string;
};

type ExpenseSplit = {
  id: string;
  expense_id: string;
  participant_id: string | null;
  split_type: string;
  amount: number;
};

type Payment = {
  id: string;
  trip_id: string;
  payer_id: string | null;
  receiver_id: string | null;
  amount: number;
  status: string | null;
  created_at: string;
  completed_at: string | null;
};

type Balance = {
  memberId: string;
  name: string;
  email: string;
  upiId: string | null;
  paid: number;
  owed: number;
  net: number;
};

type Transfer = {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
  fromUpiId: string | null;
  toUpiId: string | null;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getSupabase() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies();
          return cookieStore.getAll();
        },

        async setAll(cookiesToSet) {
          const cookieStore = await cookies();

          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {
            // Cookie writes can fail in some
            // server-component contexts.
          }
        },
      },
    }
  );
}

async function loadSettlement(
  tripId: string
) {
  const supabase = getSupabase();

  const {
    data: {
      user,
    },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      "Please sign in before viewing settlement."
    );
  }

  const { data: viewerMembership, error: viewerMembershipError } =
    await supabase
      .from("trip_members")
      .select("id")
      .eq("trip_id", tripId)
      .eq("user_id", user.id)
      .maybeSingle();

  if (viewerMembershipError) {
    throw viewerMembershipError;
  }

  if (!viewerMembership) {
    throw new Error("You are not a member of this trip.");
  }

  const [
    memberResult,
    expenseResult,
    splitResult,
    paymentResult,
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
            upi_id
          )
        `
      )
      .eq("trip_id", tripId),

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
      .eq("trip_id", tripId)
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
      .eq("trip_id", tripId)
      .order("created_at", {
        ascending: false,
      }),
  ]);

  if (memberResult.error) {
    throw memberResult.error;
  }

  if (expenseResult.error) {
    throw expenseResult.error;
  }

  if (splitResult.error) {
    throw splitResult.error;
  }

  if (paymentResult.error) {
    throw paymentResult.error;
  }

  const members =
    (memberResult.data ?? []) as unknown as Member[];

  const expenses =
    (expenseResult.data ?? []) as Expense[];

  const allSplits =
    (splitResult.data ?? []) as ExpenseSplit[];

  const payments =
    (paymentResult.data ?? []) as Payment[];

  const memberMap = new Map<
    string,
    Balance
  >();

  for (const member of members) {
    const profile = Array.isArray(member.profiles)
      ? member.profiles[0] || null
      : member.profiles || null;

    memberMap.set(member.user_id, {
      memberId: member.user_id,
      name:
        profile?.name?.trim() ||
        profile?.email?.trim() ||
        `Traveler ${memberMap.size + 1}`,
      email:
        profile?.email?.trim() || "",
      upiId:
        profile?.upi_id?.trim() || null,
      paid: 0,
      owed: 0,
      net: 0,
    });
  }

  /*
   * Calculate what each person paid.
   */
  for (const expense of expenses) {
    if (!expense.paid_by) {
      continue;
    }

    const payer =
      memberMap.get(expense.paid_by);

    if (!payer) {
      continue;
    }

    payer.paid = roundMoney(
      payer.paid +
        Number(expense.amount || 0)
    );
  }

  /*
   * Calculate what each person owes
   * according to expense_splits.
   */
  for (const split of allSplits) {
    if (!split.participant_id) {
      continue;
    }

    const member =
      memberMap.get(
        split.participant_id
      );

    if (!member) {
      continue;
    }

    member.owed = roundMoney(
      member.owed +
        Number(split.amount || 0)
    );
  }

  /*
   * Legacy protection:
   *
   * If an expense exists but has no splits,
   * divide it equally among current trip members.
   *
   * This is NOT dummy data.
   * It is only a fallback for old expense rows
   * that were created before splits existed.
   */
  const expenseIdsWithSplits =
    new Set(
      allSplits.map(
        (split) =>
          split.expense_id
      )
    );

  const fallbackMembers =
    Array.from(memberMap.values());

  for (const expense of expenses) {
    if (
      expenseIdsWithSplits.has(
        expense.id
      )
    ) {
      continue;
    }

    if (!fallbackMembers.length) {
      continue;
    }

    const share = roundMoney(
      Number(expense.amount || 0) /
        fallbackMembers.length
    );

    for (const member of fallbackMembers) {
      member.owed = roundMoney(
        member.owed + share
      );
    }
  }

  /*
   * Apply completed payments.
   *
   * Positive net = should receive.
   * Negative net = owes.
   *
   * If A pays B:
   * A's outstanding debt decreases.
   * B's outstanding credit decreases.
   */
  for (const payment of payments) {
    if (
      payment.status !==
      "completed"
    ) {
      continue;
    }

    if (
      !payment.payer_id ||
      !payment.receiver_id
    ) {
      continue;
    }

    const payer =
      memberMap.get(
        payment.payer_id
      );

    const receiver =
      memberMap.get(
        payment.receiver_id
      );

    if (!payer || !receiver) {
      continue;
    }

    const amount = Number(
      payment.amount || 0
    );

    payer.paid = roundMoney(
      payer.paid + amount
    );

    receiver.owed = roundMoney(
      receiver.owed + amount
    );
  }

  const balances =
    Array.from(
      memberMap.values()
    ).map((member) => ({
      ...member,
      net: roundMoney(
        member.paid -
          member.owed
      ),
    }));

  const transfers =
    minimizeTransfers(
      balances
    );

  const totalExpenses =
    roundMoney(
      expenses.reduce(
        (sum, expense) =>
          sum +
          Number(
            expense.amount || 0
          ),
        0
      )
    );

  const totalPaid =
    roundMoney(
      payments
        .filter(
          (payment) =>
            payment.status ===
            "completed"
        )
        .reduce(
          (sum, payment) =>
            sum +
            Number(
              payment.amount || 0
            ),
          0
        )
    );

  return {
    tripId,
    totalExpenses,
    totalPaid,
    outstanding:
      roundMoney(
        transfers.reduce(
          (sum, transfer) =>
            sum +
            transfer.amount,
          0
        )
      ),
    expenseCount:
      expenses.length,
    paymentCount:
      payments.filter(
        (payment) =>
          payment.status ===
          "completed"
      ).length,
    members: balances,
    transfers,
    payments,
  };
}

function minimizeTransfers(
  balances: Balance[]
): Transfer[] {
  const debtors = balances
    .filter(
      (person) =>
        person.net < -0.009
    )
    .map((person) => ({
      ...person,
      amount:
        Math.abs(person.net),
    }))
    .sort(
      (a, b) =>
        b.amount - a.amount
    );

  const creditors = balances
    .filter(
      (person) =>
        person.net > 0.009
    )
    .map((person) => ({
      ...person,
      amount: person.net,
    }))
    .sort(
      (a, b) =>
        b.amount - a.amount
    );

  const result: Transfer[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (
    debtorIndex <
      debtors.length &&
    creditorIndex <
      creditors.length
  ) {
    const debtor =
      debtors[debtorIndex];

    const creditor =
      creditors[creditorIndex];

    const amount = roundMoney(
      Math.min(
        debtor.amount,
        creditor.amount
      )
    );

    if (amount <= 0) {
      break;
    }

    result.push({
      from: debtor.name,
      fromId: debtor.memberId,
      to: creditor.name,
      toId: creditor.memberId,
      amount,
      fromUpiId:
        debtor.upiId,
      toUpiId:
        creditor.upiId,
    });

    debtor.amount =
      roundMoney(
        debtor.amount -
          amount
      );

    creditor.amount =
      roundMoney(
        creditor.amount -
          amount
      );

    if (
      debtor.amount <=
      0.009
    ) {
      debtorIndex++;
    }

    if (
      creditor.amount <=
      0.009
    ) {
      creditorIndex++;
    }
  }

  return result;
}

/* =========================================================
   GET SETTLEMENT
   ========================================================= */

export async function GET(
  request: NextRequest
) {
  try {
    const tripId =
      request.nextUrl.searchParams.get(
        "tripId"
      );

    if (!tripId) {
      return NextResponse.json(
        {
          error:
            "tripId is required.",
        },
        {
          status: 400,
        }
      );
    }

    const data =
      await loadSettlement(
        tripId
      );

    return NextResponse.json(
      data
    );
  } catch (error) {
    console.error(
      "Settlement GET error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to calculate settlement.",
      },
      {
        status: 500,
      }
    );
  }
}

/* =========================================================
   POST PAYMENT
   ========================================================= */

export async function POST(
  request: NextRequest
) {
  try {
    const supabase =
      getSupabase();

    const {
      data: {
        user,
      },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Please sign in before recording a payment.",
        },
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const tripId =
      String(
        body.tripId || ""
      );

    const payerId =
      String(
        body.payerId || ""
      );

    const receiverId =
      String(
        body.receiverId || ""
      );

    const amount =
      Number(body.amount);

    if (
      !tripId ||
      !payerId ||
      !receiverId
    ) {
      return NextResponse.json(
        {
          error:
            "Trip, payer and receiver are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      payerId ===
      receiverId
    ) {
      return NextResponse.json(
        {
          error:
            "Payer and receiver must be different.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isFinite(
        amount
      ) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Payment amount must be greater than zero.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Confirm both people belong
     * to this trip.
     */
    const {
      data: members,
      error:
        membersError,
    } = await supabase
      .from("trip_members")
      .select("user_id")
      .eq("trip_id", tripId)
      .in(
        "user_id",
        [
          payerId,
          receiverId,
        ]
      );

    if (membersError) {
      throw membersError;
    }

    const memberIds =
      new Set(
        (members ?? []).map(
          (member) =>
            member.user_id
        )
      );

    if (
      !memberIds.has(
        payerId
      ) ||
      !memberIds.has(
        receiverId
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Both payment users must belong to this trip.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Recalculate settlement immediately
     * before inserting the payment.
     */
    const settlement =
      await loadSettlement(
        tripId
      );

    const matchingTransfer =
      settlement.transfers.find(
        (transfer) =>
          transfer.fromId ===
            payerId &&
          transfer.toId ===
            receiverId
      );

    if (
      !matchingTransfer
    ) {
      return NextResponse.json(
        {
          error:
            "There is currently no outstanding settlement from this payer to this receiver.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      amount >
      matchingTransfer.amount +
        0.01
    ) {
      return NextResponse.json(
        {
          error:
            `Payment cannot exceed the outstanding amount of ₹${matchingTransfer.amount.toFixed(
              2
            )}.`,
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: insertedPayment,
      error:
        paymentError,
    } = await supabase
      .from("payments")
      .insert({
        trip_id:
          tripId,
        payer_id:
          payerId,
        receiver_id:
          receiverId,
        amount:
          roundMoney(
            amount
          ),
        status:
          "completed",
        completed_at:
          new Date().toISOString(),
      })
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
      .single();

    if (paymentError) {
      console.error("PAYMENTS INSERT ERROR:", paymentError);

      if (paymentError.code === "42501") {
        throw new Error(
          "Supabase blocked the settlement payment insert. Add the payments INSERT RLS policy from the TripWise settlement setup SQL."
        );
      }

      throw new Error(paymentError.message || "Unable to save settlement payment.");
    }

    const updatedSettlement =
      await loadSettlement(
        tripId
      );

    return NextResponse.json({
      success: true,
      payment:
        insertedPayment,
      settlement:
        updatedSettlement,
    });
  } catch (error) {
    console.error(
      "Settlement payment error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to record payment.",
      },
      {
        status: 500,
      }
    );
  }
}