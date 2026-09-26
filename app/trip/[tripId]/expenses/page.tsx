"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  Car,
  Check,
  ChevronRight,
  CircleDollarSign,
  Hotel,
  Loader2,
  MapPin,
  Receipt,
  RefreshCw,
  ScanLine,
  Ticket,
  Trash2,
  UserRound,
  Users,
  Utensils,
  WalletCards,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Trip = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
};

type Member = {
  id: string;
  name: string | null;
  email: string | null;
  upi_id: string | null;
};

type Expense = {
  id: string;
  trip_id: string;
  title: string;
  amount: number;
  category: string | null;
  expense_date: string | null;
  created_at: string;
  paid_by: string | null;
};

type ExpenseSplit = {
  id: string;
  expense_id: string;
  participant_id: string;
  split_type: string;
  amount: number;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function getExpenseIcon(category: string | null) {
  const value = (category || "").toLowerCase();

  if (
    value.includes("food") ||
    value.includes("restaurant") ||
    value.includes("dinner") ||
    value.includes("lunch")
  ) {
    return <Utensils size={18} />;
  }

  if (
    value.includes("hotel") ||
    value.includes("stay") ||
    value.includes("accommodation")
  ) {
    return <Hotel size={18} />;
  }

  if (
    value.includes("taxi") ||
    value.includes("transport") ||
    value.includes("travel")
  ) {
    return <Car size={18} />;
  }

  if (
    value.includes("activity") ||
    value.includes("ticket") ||
    value.includes("entertainment")
  ) {
    return <Ticket size={18} />;
  }

  return <Receipt size={18} />;
}

function getMemberName(member: Member) {
  return (
    member.name?.trim() ||
    member.email?.split("@")[0] ||
    "Traveler"
  );
}

function formatTripDates(
  startDate: string | null,
  endDate: string | null
) {
  if (!startDate && !endDate) {
    return "Dates not set";
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const sameYear =
      start.getFullYear() === end.getFullYear();

    const startText = start.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        ...(sameYear ? {} : { year: "numeric" }),
      }
    );

    const endText = end.toLocaleDateString(
      "en-IN",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );

    return `${startText} – ${endText}`;
  }

  const date = new Date(
    startDate || endDate || ""
  );

  if (Number.isNaN(date.getTime())) {
    return "Dates not set";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function ExpensesPage() {
  const params = useParams<{
    tripId: string;
  }>();

  const tripId = params.tripId;

  /* ------------------------------------------------------------------------ */
  /* State                                                                    */
  /* ------------------------------------------------------------------------ */

  const [trip, setTrip] = useState<Trip | null>(null);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [splits, setSplits] =
    useState<ExpenseSplit[]>([]);

  const [title, setTitle] = useState("");

  const [amount, setAmount] = useState("");

  const [category, setCategory] =
    useState("Food");

  const [paidBy, setPaidBy] = useState("");

  const [selectedParticipants, setSelectedParticipants] =
    useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [success, setSuccess] = useState("");

  /* ------------------------------------------------------------------------ */
  /* Load trip                                                                */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!tripId) return;

    loadTrip();
    loadExpenses();
  }, [tripId]);

  async function loadTrip() {
    try {
      const response = await fetch(
        `/api/trips?id=${encodeURIComponent(tripId)}`,
        {
          cache: "no-store",
        }
      );

      /*
       * If the trips API does not support ?id,
       * use the direct Supabase query fallback.
       */
      if (response.ok) {
        const data = await response.json();

        const loadedTrip =
          data?.trip ||
          data?.data ||
          (Array.isArray(data?.trips)
            ? data.trips[0]
            : null);

        if (loadedTrip) {
          setTrip(loadedTrip);
          return;
        }
      }
    } catch {
      // Fall through to direct Supabase request.
    }

    /*
     * Direct fallback.
     */
    try {
      const { getSupabase } =
        await import("@/lib/supabase");

      const supabase = getSupabase();

      const { data, error } = await supabase
        .from("trips")
        .select(
          "id, name, destination, start_date, end_date"
        )
        .eq("id", tripId)
        .maybeSingle();

      if (error) {
        console.error(
          "Trip loading error:",
          error
        );
        return;
      }

      setTrip(data);
    } catch (error) {
      console.error(
        "Trip loading error:",
        error
      );
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Load expenses                                                            */
  /* ------------------------------------------------------------------------ */

  async function loadExpenses(
    showRefresh = false
  ) {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await fetch(
        `/api/expenses?tripId=${encodeURIComponent(
          tripId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load expenses."
        );
      }

      setExpenses(data.expenses ?? []);

      setMembers(data.members ?? []);

      setSplits(data.splits ?? []);

      if (
        !paidBy &&
        data.members?.length > 0
      ) {
        setPaidBy(data.members[0].id);
      }

      if (
        selectedParticipants.length === 0 &&
        data.members?.length > 0
      ) {
        setSelectedParticipants(
          data.members.map(
            (member: Member) => member.id
          )
        );
      }
    } catch (err: any) {
      console.error(
        "Expenses loading error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load expenses."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Add expense                                                              */
  /* ------------------------------------------------------------------------ */

  async function addExpense(
    event: FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const cleanTitle = title.trim();

    const numericAmount = Number(amount);

    if (!cleanTitle) {
      setError(
        "Please enter an expense title."
      );
      return;
    }

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError(
        "Please enter a valid amount."
      );
      return;
    }

    if (!paidBy) {
      setError(
        "Please select who paid."
      );
      return;
    }

    if (
      selectedParticipants.length === 0
    ) {
      setError(
        "Please select at least one participant."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/expenses",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            tripId,
            title: cleanTitle,
            amount: numericAmount,
            category,
            expenseDate: new Date()
              .toISOString()
              .slice(0, 10),
            paidBy,
            participantIds:
              selectedParticipants,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to save expense."
        );
      }

      setTitle("");
      setAmount("");

      setSuccess(
        "Expense saved to your trip."
      );

      await loadExpenses();
    } catch (err: any) {
      console.error(
        "Expense save error:",
        err
      );

      setError(
        err?.message ||
          "Unable to save expense."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Delete expense                                                           */
  /* ------------------------------------------------------------------------ */

  async function deleteExpense(
    expenseId: string
  ) {
    const confirmed =
      window.confirm(
        "Delete this expense? This will also remove its split records."
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(expenseId);

      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/expenses?id=${encodeURIComponent(
          expenseId
        )}&tripId=${encodeURIComponent(
          tripId
        )}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to delete expense."
        );
      }

      setSuccess("Expense deleted.");

      await loadExpenses();
    } catch (err: any) {
      console.error(
        "Expense delete error:",
        err
      );

      setError(
        err?.message ||
          "Unable to delete expense."
      );
    } finally {
      setDeletingId(null);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Participant toggle                                                       */
  /* ------------------------------------------------------------------------ */

  function toggleParticipant(
    memberId: string
  ) {
    setSelectedParticipants(
      (current) => {
        if (current.includes(memberId)) {
          return current.filter(
            (id) => id !== memberId
          );
        }

        return [...current, memberId];
      }
    );
  }

  function selectEveryone() {
    setSelectedParticipants(
      members.map(
        (member) => member.id
      )
    );
  }

  function clearParticipants() {
    setSelectedParticipants([]);
  }

  /* ------------------------------------------------------------------------ */
  /* Derived values                                                           */
  /* ------------------------------------------------------------------------ */

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (sum, expense) =>
        sum +
        Number(expense.amount || 0),
      0
    );
  }, [expenses]);

  const participantCount =
    selectedParticipants.length;

  const previewAmount =
    Number(amount) || 0;

  const estimatedShare =
    participantCount > 0
      ? previewAmount /
        participantCount
      : 0;

  function getPayerName(
    payerId: string | null
  ) {
    const member = members.find(
      (item) =>
        item.id === payerId
    );

    if (!member) {
      return "Unknown";
    }

    return getMemberName(member);
  }

  function getExpenseSplitCount(
    expenseId: string
  ) {
    return splits.filter(
      (split) =>
        split.expense_id === expenseId
    ).length;
  }

  /* ------------------------------------------------------------------------ */
  /* Loading                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e6] text-[#191917]">
        <div className="mx-auto max-w-6xl px-5 py-10 md:px-10">
          <div className="h-5 w-24 animate-pulse rounded bg-[#e2ddcf]" />

          <div className="mt-8 h-14 w-72 animate-pulse rounded-xl bg-[#e2ddcf]" />

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
            <div className="h-[500px] animate-pulse rounded-[28px] bg-[#e8e3d7]" />

            <div className="h-[500px] animate-pulse rounded-[28px] bg-[#e8e3d7]" />
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Page                                                                     */
  /* ------------------------------------------------------------------------ */

  return (
    <main className="min-h-screen overflow-hidden bg-[#f4f0e6] text-[#191917]">
      {/* Background */}

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(31,39,34,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(31,39,34,.055) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />

        <div className="absolute right-[-150px] top-20 h-[500px] w-[500px] rounded-full bg-[#d8d0bd]/35 blur-3xl" />

        <div className="absolute bottom-[-150px] left-[-100px] h-[450px] w-[450px] rounded-full bg-[#cfd7c6]/35 blur-3xl" />
      </div>

      {/* Header */}

      <header className="sticky top-0 z-40 border-b border-[#292a25]/10 bg-[#f4f0e6]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[78px] max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-10">
          <Link
            href="/dashboard"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-bold text-[#68655d] transition hover:text-[#191917]"
          >
            <ArrowLeft size={16} />

            <span className="hidden sm:inline">
              My Trips
            </span>

            <span className="sm:hidden">
              Trips
            </span>
          </Link>

          {/* CURRENT TRIP */}

          <Link
            href={`/trip/${tripId}`}
            className="group min-w-0 flex-1 text-center"
          >
            <div className="mx-auto max-w-[330px]">
              <p className="truncate text-[9px] font-bold uppercase tracking-[.2em] text-[#927543]">
                Current trip
              </p>

              <p className="mt-0.5 truncate font-serif text-lg leading-tight transition group-hover:text-[#355244]">
                {trip?.name ||
                  "Loading trip..."}
              </p>

              <p className="mt-0.5 flex items-center justify-center gap-1 truncate text-[10px] text-[#8b877d]">
                {trip?.destination && (
                  <>
                    <MapPin size={10} />
                    <span>
                      {trip.destination}
                    </span>
                  </>
                )}
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                loadExpenses(true)
              }
              disabled={refreshing}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#292a25]/10 bg-[#f8f5ec] text-[#68655d] transition hover:bg-white disabled:opacity-50"
              title="Refresh expenses"
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />
            </button>

            <Link
              href={`/trip/${tripId}/settlement`}
              className="hidden items-center gap-2 rounded-xl bg-[#191a18] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2b302c] sm:inline-flex"
            >
              Settlement
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">
        {/* TRIP CONTEXT */}

        <section className="rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_15px_45px_rgba(41,42,37,.035)] md:p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                <MapPin size={12} />

                <span>
                  {trip?.destination ||
                    "Your trip"}
                </span>

                <span className="text-[#aaa59a]">
                  ·
                </span>

                <span>
                  {formatTripDates(
                    trip?.start_date ||
                      null,
                    trip?.end_date ||
                      null
                  )}
                </span>
              </div>

              <h1 className="mt-2 truncate font-serif text-4xl tracking-[-.04em] md:text-5xl">
                {trip?.name ||
                  "Trip expenses"}
              </h1>

              <p className="mt-2 text-xs text-[#817d74]">
                Expenses for this trip only.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <TripTab
                href={`/trip/${tripId}`}
                label="Overview"
              />

              <TripTab
                href={`/trip/${tripId}/expenses`}
                label="Expenses"
                active
              />

              <TripTab
                href={`/trip/${tripId}/bookings`}
                label="Bookings"
              />

              <TripTab
                href={`/trip/${tripId}/itinerary`}
                label="Itinerary"
              />

              <TripTab
                href={`/trip/${tripId}/settlement`}
                label="Settlement"
              />
            </div>
          </div>
        </section>

        {/* Messages */}

        {error && (
          <div className="mt-6 rounded-2xl border border-[#9a5b52]/20 bg-[#fff4f1] px-4 py-3 text-sm font-semibold text-[#874c44]">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#496451]/20 bg-[#eef5ed] px-4 py-3 text-sm font-semibold text-[#3d5843]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dce9dc]">
              <Check size={15} />
            </span>

            {success}
          </div>
        )}

        {/* Page title */}

        <section className="mt-8">
          <p className="text-[10px] font-bold uppercase tracking-[.22em] text-[#927543]">
            Trip ledger
          </p>

          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h2 className="font-serif text-5xl leading-none md:text-6xl">
                Expenses
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-[#817d74]">
                Keep every group expense connected
                to this trip. Your saved expenses
                automatically flow into settlement.
              </p>
            </div>

            <div className="rounded-[22px] border border-[#292a25]/10 bg-[#f8f5ec] px-5 py-4">
              <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#927543]">
                Trip total
              </p>

              <p className="mt-1 font-serif text-3xl">
                {formatMoney(
                  totalExpenses
                )}
              </p>

              <p className="mt-1 text-xs text-[#8b877d]">
                {expenses.length}{" "}
                {expenses.length === 1
                  ? "expense"
                  : "expenses"}{" "}
                saved
              </p>
            </div>
          </div>
        </section>

        {/* Main grid */}

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.02fr_.98fr]">
          {/* Add expense */}

          <section className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_20px_60px_rgba(41,42,37,0.04)] md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#355244]">
                  <CircleDollarSign size={20} />
                </div>

                <h2 className="mt-5 font-serif text-3xl">
                  Add an expense
                </h2>

                <p className="mt-2 text-xs leading-5 text-[#817d74]">
                  Saved directly to this trip's
                  database ledger.
                </p>
              </div>

              <span className="rounded-full bg-[#e6e2d6] px-3 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#68655d]">
                Live database
              </span>
            </div>

            <form
              onSubmit={addExpense}
              className="mt-7 space-y-5"
            >
              {/* Title */}

              <div>
                <label className="mb-2 block text-xs font-bold text-[#68655d]">
                  Expense name
                </label>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="Dinner, taxi, hotel…"
                  className="w-full rounded-2xl border border-[#292a25]/12 bg-white px-4 py-3.5 text-sm outline-none transition placeholder:text-[#aaa59a] focus:border-[#355244]/40 focus:ring-4 focus:ring-[#355244]/5"
                />
              </div>

              {/* Amount + category */}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-[#68655d]">
                    Amount
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#8b877d]">
                      ₹
                    </span>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(event) =>
                        setAmount(
                          event.target.value
                        )
                      }
                      placeholder="0"
                      className="w-full rounded-2xl border border-[#292a25]/12 bg-white py-3.5 pl-9 pr-4 text-sm outline-none transition placeholder:text-[#aaa59a] focus:border-[#355244]/40 focus:ring-4 focus:ring-[#355244]/5"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-[#68655d]">
                    Category
                  </label>

                  <select
                    value={category}
                    onChange={(event) =>
                      setCategory(
                        event.target.value
                      )
                    }
                    className="w-full rounded-2xl border border-[#292a25]/12 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[#355244]/40 focus:ring-4 focus:ring-[#355244]/5"
                  >
                    <option>
                      Food
                    </option>
                    <option>
                      Hotel
                    </option>
                    <option>
                      Transport
                    </option>
                    <option>
                      Activity
                    </option>
                    <option>
                      Other
                    </option>
                  </select>
                </div>
              </div>

              {/* Paid by */}

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-xs font-bold text-[#68655d]">
                    Paid by
                  </label>

                  <span className="text-[10px] text-[#aaa59a]">
                    Who actually paid?
                  </span>
                </div>

                <select
                  value={paidBy}
                  onChange={(event) =>
                    setPaidBy(
                      event.target.value
                    )
                  }
                  className="w-full rounded-2xl border border-[#292a25]/12 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-[#355244]/40 focus:ring-4 focus:ring-[#355244]/5"
                >
                  <option value="">
                    Select payer
                  </option>

                  {members.map(
                    (member) => (
                      <option
                        key={member.id}
                        value={member.id}
                      >
                        {getMemberName(
                          member
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Participants */}

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#68655d]">
                      Split between
                    </label>

                    <p className="mt-1 text-[10px] text-[#aaa59a]">
                      Select who owes a share
                      of this expense.
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={
                        selectEveryone
                      }
                      className="rounded-lg bg-[#e8e5d9] px-2.5 py-1.5 text-[10px] font-bold text-[#566055] transition hover:bg-[#ddd9cb]"
                    >
                      Everyone
                    </button>

                    <button
                      type="button"
                      onClick={
                        clearParticipants
                      }
                      className="rounded-lg border border-[#292a25]/10 px-2.5 py-1.5 text-[10px] font-bold text-[#817d74] transition hover:bg-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {members.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#292a25]/15 bg-white p-5 text-center">
                      <Users
                        size={20}
                        className="mx-auto text-[#aaa59a]"
                      />

                      <p className="mt-2 text-xs font-bold">
                        No participants
                      </p>
                    </div>
                  ) : (
                    members.map(
                      (member) => {
                        const selected =
                          selectedParticipants.includes(
                            member.id
                          );

                        return (
                          <button
                            key={
                              member.id
                            }
                            type="button"
                            onClick={() =>
                              toggleParticipant(
                                member.id
                              )
                            }
                            className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                              selected
                                ? "border-[#355244]/25 bg-[#eef3ec]"
                                : "border-[#292a25]/10 bg-white hover:bg-[#fcfbf8]"
                            }`}
                          >
                            <span className="flex items-center gap-3">
                              <span
                                className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                                  selected
                                    ? "bg-[#355244] text-white"
                                    : "bg-[#e8e5d9] text-[#68655d]"
                                }`}
                              >
                                {selected ? (
                                  <Check
                                    size={
                                      16
                                    }
                                  />
                                ) : (
                                  <UserRound
                                    size={
                                      16
                                    }
                                  />
                                )}
                              </span>

                              <span>
                                <b className="block text-xs">
                                  {getMemberName(
                                    member
                                  )}
                                </b>

                                {member.email && (
                                  <small className="block text-[10px] text-[#aaa59a]">
                                    {
                                      member.email
                                    }
                                  </small>
                                )}
                              </span>
                            </span>

                            <span className="text-[10px] font-bold text-[#817d74]">
                              {selected &&
                              estimatedShare >
                                0
                                ? formatMoney(
                                    estimatedShare
                                  )
                                : "—"}
                            </span>
                          </button>
                        );
                      }
                    )
                  )}
                </div>
              </div>

              {/* Preview */}

              <div className="rounded-2xl bg-[#f0ece1] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#817d74]">
                    Split preview
                  </span>

                  <span className="text-xs font-bold text-[#355244]">
                    {participantCount}{" "}
                    {participantCount ===
                    1
                      ? "person"
                      : "people"}
                  </span>
                </div>

                <div className="mt-2 flex items-end justify-between">
                  <span className="font-serif text-2xl">
                    {formatMoney(
                      previewAmount
                    )}
                  </span>

                  <span className="text-xs text-[#817d74]">
                    ≈{" "}
                    {formatMoney(
                      estimatedShare
                    )}{" "}
                    / person
                  </span>
                </div>
              </div>

              {/* Save */}

              <button
                type="submit"
                disabled={
                  saving ||
                  members.length === 0
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#191a18] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#2b302c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />

                    Saving to database…
                  </>
                ) : (
                  <>
                    <WalletCards
                      size={17}
                    />

                    Save expense
                  </>
                )}
              </button>
            </form>

            {/* Scanner */}

            <button
              type="button"
              onClick={() =>
                alert(
                  "Bill scanner is the next AI feature. Your manual expenses are already saving to Supabase."
                )
              }
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#292a25]/10 bg-white px-5 py-3.5 text-xs font-bold text-[#68655d] transition hover:bg-[#fcfbf8]"
            >
              <ScanLine size={16} />

              Scan bill with AI
            </button>
          </section>

          {/* Ledger */}

          <section className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_20px_60px_rgba(41,42,37,0.04)] md:p-7">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-3xl">
                    Ledger
                  </h2>

                  <span className="rounded-full bg-[#e8e5d9] px-2.5 py-1 text-[10px] font-bold text-[#68655d]">
                    {expenses.length}
                  </span>
                </div>

                <p className="mt-2 text-xs text-[#817d74]">
                  Only expenses belonging to{" "}
                  {trip?.name ||
                    "this trip"}{" "}
                  are shown.
                </p>
              </div>

              <div className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[.12em] text-[#927543] sm:flex">
                <span className="h-2 w-2 rounded-full bg-[#496451]" />
                Synced
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {expenses.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-[#292a25]/15 bg-white px-6 py-14 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#68655d]">
                    <Receipt size={23} />
                  </div>

                  <h3 className="mt-5 font-serif text-2xl">
                    No expenses yet
                  </h3>

                  <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-[#817d74]">
                    Add your first expense and
                    it will immediately be
                    available to the settlement
                    calculator.
                  </p>
                </div>
              ) : (
                expenses.map(
                  (expense) => {
                    const splitCount =
                      getExpenseSplitCount(
                        expense.id
                      );

                    return (
                      <div
                        key={
                          expense.id
                        }
                        className="group rounded-[22px] border border-[#292a25]/8 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(41,42,37,0.06)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#566055]">
                              {getExpenseIcon(
                                expense.category
                              )}
                            </span>

                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-bold text-[#191917]">
                                {
                                  expense.title
                                }
                              </h3>

                              <p className="mt-1 text-[10px] text-[#8b877d]">
                                {
                                  expense.category
                                }

                                {" · "}

                                Paid by{" "}

                                {getPayerName(
                                  expense.paid_by
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="font-serif text-xl">
                              {formatMoney(
                                Number(
                                  expense.amount
                                )
                              )}
                            </p>

                            <p className="mt-1 text-[10px] text-[#aaa59a]">
                              {expense.expense_date ||
                                "Today"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between border-t border-[#292a25]/7 pt-3">
                          <div className="flex items-center gap-2 text-[10px] font-semibold text-[#8b877d]">
                            <Users size={13} />

                            Split between{" "}
                            {
                              splitCount
                            }{" "}
                            {splitCount ===
                            1
                              ? "person"
                              : "people"}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              deleteExpense(
                                expense.id
                              )
                            }
                            disabled={
                              deletingId ===
                              expense.id
                            }
                            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-[#9a5b52] transition hover:bg-[#fff4f1] disabled:opacity-50"
                          >
                            {deletingId ===
                            expense.id ? (
                              <Loader2
                                size={
                                  13
                                }
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2
                                size={
                                  13
                                }
                              />
                            )}

                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  }
                )
              )}
            </div>

            <Link
              href={`/trip/${tripId}/settlement`}
              className="mt-5 flex items-center justify-between rounded-2xl border border-[#292a25]/10 bg-[#191a18] p-4 text-white transition hover:bg-[#2b302c]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                  <WalletCards size={16} />
                </div>

                <div>
                  <p className="text-xs font-bold">
                    Open settlement
                  </p>

                  <p className="mt-0.5 text-[10px] text-white/55">
                    See who owes whom for{" "}
                    {trip?.name ||
                      "this trip"}
                  </p>
                </div>
              </div>

              <ChevronRight
                size={17}
                className="text-white/60"
              />
            </Link>
          </section>
        </div>

        {/* Database explanation */}

        <section className="mt-6 rounded-[26px] border border-[#292a25]/10 bg-[#ece8dc] p-5 md:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f8f5ec] text-[#355244]">
              <Receipt size={18} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[.14em] text-[#927543]">
                Trip-specific ledger
              </p>

              <p className="mt-2 text-xs leading-5 text-[#68655d]">
                Every expense is stored with this
                trip's ID. Its split records are
                connected to the expense, and the
                settlement page reads those database
                records when calculating balances.
                Expenses from another trip are not
                included here.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Trip tab                                                                   */
/* -------------------------------------------------------------------------- */

function TripTab({
  href,
  label,
  active = false,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-2 text-[10px] font-bold transition ${
        active
          ? "bg-[#191a18] text-white"
          : "border border-[#292a25]/10 bg-white text-[#68655d] hover:bg-[#f1eee5]"
      }`}
    >
      {label}
    </Link>
  );
}