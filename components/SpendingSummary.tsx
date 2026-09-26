"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  FileText,
  Loader2,
  PieChart,
  Receipt,
  RefreshCw,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import TripSidebar from "@/components/TripSidebar";

type Trip = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at?: string;
};

type Expense = {
  id: string;
  title: string;
  amount: number | string;
  category: string | null;
  expense_date: string | null;
  created_at: string;
};

type SummaryProps = {
  initialTripId?: string;
};

const PIE_STOPS = [
  "#355244",
  "#927543",
  "#7b6f63",
  "#657b70",
  "#b08c55",
  "#8a7d91",
  "#5e6875",
  "#9a5b52",
];

function formatMoney(value: number) {
  return `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function tripDates(trip: Trip) {
  if (!trip.start_date && !trip.end_date) return "Dates not set";
  if (trip.start_date && trip.end_date) {
    return `${formatDate(trip.start_date)} – ${formatDate(trip.end_date)}`;
  }
  return formatDate(trip.start_date || trip.end_date);
}

function cleanCategory(category: string | null) {
  const value = category?.trim();
  return value || "Other";
}

export default function SpendingSummary({
  initialTripId,
}: SummaryProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTripId, setSelectedTripId] = useState(initialTripId || "");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string | null; email: string | null }[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    if (selectedTripId) {
      loadSummary(selectedTripId);
    }
  }, [selectedTripId]);

  async function loadTrips() {
    try {
      setLoadingTrips(true);
      setError("");

      const supabase = getSupabase();
      const { data, error: tripError } = await supabase
        .from("trips")
        .select(
          "id, name, destination, start_date, end_date, created_at"
        )
        .order("created_at", { ascending: false });

      if (tripError) throw tripError;

      const loadedTrips = (data || []) as Trip[];
      setTrips(loadedTrips);

      if (loadedTrips.length === 0) {
        setSelectedTripId("");
        return;
      }

      if (
        initialTripId &&
        loadedTrips.some((trip) => trip.id === initialTripId)
      ) {
        setSelectedTripId(initialTripId);
      } else {
        setSelectedTripId(loadedTrips[0].id);
      }
    } catch (err) {
      console.error("Summary trip loading error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your trips."
      );
    } finally {
      setLoadingTrips(false);
    }
  }

  async function loadSummary(tripId: string, refresh = false) {
    try {
      if (refresh) setRefreshing(true);
      else setLoadingSummary(true);

      setError("");

      const response = await fetch(
        `/api/expenses?tripId=${encodeURIComponent(tripId)}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load spending summary."
        );
      }

      setMembers(data.members || []);
      setExpenses(
        (data.expenses || []).map((expense: Expense) => ({
          ...expense,
          amount: Number(expense.amount || 0),
        }))
      );
    } catch (err) {
      console.error("Summary loading error:", err);
      setExpenses([]);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load spending summary."
      );
    } finally {
      setLoadingSummary(false);
      setRefreshing(false);
    }
  }

  const totalSpend = useMemo(
    () =>
      expenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
      ),
    [expenses]
  );

  const categoryData = useMemo(() => {
    const grouped = new Map<string, { amount: number; count: number }>();

    expenses.forEach((expense) => {
      const category = cleanCategory(expense.category);
      const current = grouped.get(category) || { amount: 0, count: 0 };
      current.amount += Number(expense.amount || 0);
      current.count += 1;
      grouped.set(category, current);
    });

    return Array.from(grouped.entries())
      .map(([category, value]) => ({
        category,
        amount: value.amount,
        count: value.count,
        percentage: totalSpend > 0 ? (value.amount / totalSpend) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, totalSpend]);

  const topCategory = categoryData[0] || null;

  const averageExpense =
    expenses.length > 0 ? totalSpend / expenses.length : 0;

  const payerData = useMemo(() => {
    const grouped = new Map<string, number>();

    expenses.forEach((expense) => {
      const member = members.find((item) => item.id === expense.paid_by);
      const payer =
        member?.name?.trim() ||
        member?.email?.split("@")[0] ||
        (expense.paid_by ? "Trip participant" : "Unknown");
      grouped.set(
        payer,
        (grouped.get(payer) || 0) + Number(expense.amount || 0)
      );
    });

    return Array.from(grouped.entries())
      .map(([payer, amount]) => ({ payer, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, members]);

  const pieGradient = useMemo(() => {
    if (totalSpend <= 0) {
      return "conic-gradient(#ded8c9 0deg 360deg)";
    }

    let cursor = 0;

    const stops = categoryData.map((item, index) => {
      const start = cursor;
      cursor += (item.percentage / 100) * 360;
      return `${PIE_STOPS[index % PIE_STOPS.length]} ${start}deg ${cursor}deg`;
    });

    return `conic-gradient(${stops.join(", ")})`;
  }, [categoryData, totalSpend]);

  function handleTripChange(tripId: string) {
    setSelectedTripId(tripId);

    if (initialTripId && tripId !== initialTripId) {
      window.history.replaceState(
        null,
        "",
        `/trip/${tripId}/summary`
      );
    }
  }

  if (loadingTrips) {
    return (
      <SummaryFrame>
        <SummaryLoader text="Finding your trips..." />
      </SummaryFrame>
    );
  }

  return (
    <SummaryFrame activeTripId={initialTripId}>
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(31,39,34,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(31,39,34,.055) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
        <div className="absolute right-[-180px] top-20 h-[520px] w-[520px] rounded-full bg-[#d8d0bd]/35 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[480px] w-[480px] rounded-full bg-[#cfd7c6]/35 blur-3xl" />
      </div>

      <div className="mb-9">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
          <span className="h-px w-7 bg-[#b8a476]" />
          Trip ledger
          <span className="text-[#aaa59a]">/</span>
          Spending summary
        </div>

        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-serif text-[48px] leading-none tracking-[-.04em] md:text-[64px]">
              Spending summary
            </h1>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#68655d]">
              See where this trip's recorded expenses are going, which
              categories drive the total, and how every number is calculated.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              selectedTripId && loadSummary(selectedTripId, true)
            }
            disabled={refreshing || !selectedTripId}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-[#292a25]/15 bg-[#f8f5ec] px-4 py-2.5 text-sm font-bold transition hover:bg-white disabled:opacity-50 lg:self-auto"
          >
            <RefreshCw
              size={15}
              className={refreshing ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-[#9a5b52]/20 bg-[#fff6f3] px-5 py-4 text-sm text-[#7d4942]">
          {error}
        </div>
      )}

      {trips.length === 0 ? (
        <EmptySummaryState />
      ) : (
        <>
          <section className="relative z-20 rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec]/95 p-5 shadow-[0_15px_50px_rgba(40,40,30,.04)] backdrop-blur md:p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                  Choose a trip
                </p>
                <p className="mt-1 text-sm text-[#817d74]">
                  Switch between summaries without leaving the ledger.
                </p>
              </div>

              <div className="relative min-w-0 md:w-[360px]">
                <select
                  value={selectedTripId}
                  onChange={(event) =>
                    handleTripChange(event.target.value)
                  }
                  className="w-full appearance-none rounded-2xl border border-[#292a25]/15 bg-white px-4 py-3 pr-11 text-sm font-bold outline-none transition focus:border-[#355244] focus:ring-4 focus:ring-[#355244]/10"
                >
                  {trips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.name}
                      {trip.destination ? ` · ${trip.destination}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={17}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#777269]"
                />
              </div>
            </div>
          </section>

          {selectedTrip && (
            <div className="mt-7">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#68655d]">
                    {selectedTrip.destination || "Trip overview"}
                  </p>
                  <h2 className="mt-1 font-serif text-3xl tracking-[-.03em]">
                    {selectedTrip.name}
                  </h2>
                </div>
                <p className="text-sm text-[#8b877d]">
                  {tripDates(selectedTrip)}
                </p>
              </div>

              {loadingSummary ? (
                <SummaryLoader text="Calculating your spending..." />
              ) : (
                <>
                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <MetricCard
                      icon={<CircleDollarSign size={18} />}
                      label="Total spend"
                      value={formatMoney(totalSpend)}
                      detail="Sum of all recorded expenses"
                    />
                    <MetricCard
                      icon={<Receipt size={18} />}
                      label="Expenses"
                      value={String(expenses.length)}
                      detail="Recorded expense entries"
                    />
                    <MetricCard
                      icon={<TrendingUp size={18} />}
                      label="Average expense"
                      value={formatMoney(averageExpense)}
                      detail="Total spend ÷ expense count"
                    />
                    <MetricCard
                      icon={<BarChart3 size={18} />}
                      label="Top category"
                      value={topCategory?.category || "—"}
                      detail={
                        topCategory
                          ? `${formatMoney(topCategory.amount)} · ${topCategory.percentage.toFixed(1)}%`
                          : "No expenses yet"
                      }
                    />
                  </section>

                  <section className="mt-6 grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
                    <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.04)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                            Category split
                          </p>
                          <h3 className="mt-2 font-serif text-2xl">
                            Where the money went
                          </h3>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#566055]">
                          <PieChart size={18} />
                        </div>
                      </div>

                      <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:items-center">
                        <div
                          className="relative h-52 w-52 shrink-0 rounded-full shadow-[0_12px_35px_rgba(40,40,30,.10)]"
                          style={{ background: pieGradient }}
                          aria-label="Spending by category pie chart"
                        >
                          <div className="absolute inset-[27%] flex flex-col items-center justify-center rounded-full bg-[#f8f5ec] text-center shadow-inner">
                            <span className="text-[10px] font-bold uppercase tracking-[.15em] text-[#8b877d]">
                              Total
                            </span>
                            <span className="mt-1 font-serif text-xl font-bold">
                              {formatMoney(totalSpend)}
                            </span>
                          </div>
                        </div>

                        <div className="min-w-0 flex-1 space-y-3">
                          {categoryData.length ? (
                            categoryData.map((item, index) => (
                              <div
                                key={item.category}
                                className="flex items-center gap-3"
                              >
                                <span
                                  className="h-3 w-3 shrink-0 rounded-full"
                                  style={{
                                    background:
                                      PIE_STOPS[index % PIE_STOPS.length],
                                  }}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="truncate text-sm font-semibold">
                                      {item.category}
                                    </span>
                                    <span className="text-sm font-bold">
                                      {formatMoney(item.amount)}
                                    </span>
                                  </div>
                                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-[#8b877d]">
                                    <span>
                                      {item.count}{" "}
                                      {item.count === 1 ? "expense" : "expenses"}
                                    </span>
                                    <span>{item.percentage.toFixed(1)}%</span>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-sm leading-6 text-[#817d74]">
                              Add expenses to this trip and the category chart
                              will appear here.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.04)]">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                            Breakdown
                          </p>
                          <h3 className="mt-2 font-serif text-2xl">
                            What is driving the total?
                          </h3>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#566055]">
                          <WalletCards size={18} />
                        </div>
                      </div>

                      <div className="mt-6 space-y-3">
                        {categoryData.length ? (
                          categoryData.map((item, index) => (
                            <div
                              key={item.category}
                              className="rounded-2xl bg-white p-4"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black text-white"
                                    style={{
                                      background:
                                        PIE_STOPS[index % PIE_STOPS.length],
                                    }}
                                  >
                                    {index + 1}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-bold">
                                      {item.category}
                                    </p>
                                    <p className="mt-1 text-xs text-[#8b877d]">
                                      {item.count}{" "}
                                      {item.count === 1
                                        ? "entry"
                                        : "entries"}{" "}
                                      · {item.percentage.toFixed(1)}% of spend
                                    </p>
                                  </div>
                                </div>
                                <p className="shrink-0 font-serif text-xl font-bold">
                                  {formatMoney(item.amount)}
                                </p>
                              </div>
                              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#ebe6da]">
                                <div
                                  className="h-full rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      item.percentage
                                    )}%`,
                                    background:
                                      PIE_STOPS[index % PIE_STOPS.length],
                                  }}
                                />
                              </div>
                            </div>
                          ))
                        ) : (
                          <EmptyState
                            title="No spending yet"
                            description="There are no recorded expenses for this trip."
                          />
                        )}
                      </div>
                    </div>
                  </section>

                  <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_.95fr]">
                    <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.04)]">
                      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                        Calculation
                      </p>
                      <h3 className="mt-2 font-serif text-2xl">
                        How the total is calculated
                      </h3>

                      <div className="mt-5 rounded-2xl bg-white p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055]">
                            <FileText size={17} />
                          </div>
                          <div>
                            <p className="text-sm font-bold">
                              Expense-based total
                            </p>
                            <p className="mt-1 text-xs text-[#8b877d]">
                              Every saved expense contributes its full amount.
                            </p>
                          </div>
                        </div>

                        <div className="mt-5 space-y-2 text-sm">
                          {categoryData.map((item) => (
                            <div
                              key={item.category}
                              className="flex items-center justify-between gap-4"
                            >
                              <span className="text-[#68655d]">
                                {item.category}
                              </span>
                              <span className="font-semibold">
                                {formatMoney(item.amount)}
                              </span>
                            </div>
                          ))}
                          <div className="my-3 border-t border-[#292a25]/10" />
                          <div className="flex items-center justify-between gap-4">
                            <span className="font-bold">Total</span>
                            <span className="font-serif text-2xl font-bold">
                              {formatMoney(totalSpend)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 text-xs leading-5 text-[#8b877d]">
                        Category percentage = category amount ÷ total spend ×
                        100. The pie chart uses the same calculation, so the
                        slices always add up to 100%.
                      </p>
                    </div>

                    <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.04)]">
                      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                        Ledger activity
                      </p>
                      <h3 className="mt-2 font-serif text-2xl">
                        Recent expenses
                      </h3>

                      <div className="mt-5 space-y-2">
                        {expenses.length ? (
                          expenses.slice(0, 6).map((expense) => (
                            <div
                              key={expense.id}
                              className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold">
                                  {expense.title}
                                </p>
                                <p className="mt-1 text-xs text-[#8b877d]">
                                  {cleanCategory(expense.category)}
                                  {expense.expense_date
                                    ? ` · ${formatDate(expense.expense_date)}`
                                    : ""}
                                </p>
                              </div>
                              <p className="shrink-0 font-serif text-lg font-bold">
                                {formatMoney(Number(expense.amount || 0))}
                              </p>
                            </div>
                          ))
                        ) : (
                          <EmptyState
                            title="Nothing recorded yet"
                            description="Your recent expense entries will appear here."
                          />
                        )}
                      </div>

                      {selectedTripId && (
                        <Link
                          href={`/trip/${selectedTripId}/expenses`}
                          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#30312d]"
                        >
                          Manage expenses
                          <ArrowLeft size={15} className="rotate-180" />
                        </Link>
                      )}
                    </div>
                  </section>

                  {payerData.length > 0 && (
                    <section className="mt-6 rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.04)]">
                      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                        Payment activity
                      </p>
                      <h3 className="mt-2 font-serif text-2xl">
                        Paid into the trip
                      </h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#817d74]">
                        This is the amount recorded as paid by each person. It
                        is different from their final settlement balance.
                      </p>

                      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {payerData.map((item) => (
                          <div
                            key={item.payer}
                            className="rounded-2xl bg-white p-4"
                          >
                            <p className="truncate text-sm font-bold">
                              {item.payer}
                            </p>
                            <p className="mt-2 font-serif text-2xl font-bold">
                              {formatMoney(item.amount)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </SummaryFrame>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[24px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_15px_50px_rgba(40,40,30,.04)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055]">
        {icon}
      </div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.18em] text-[#918a7d]">
        {label}
      </p>
      <p className="mt-1 truncate font-serif text-2xl font-bold">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-[#8b877d]">{detail}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#292a25]/15 bg-[#f4f0e6] px-6 py-10 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#566055]">
        <Receipt size={20} />
      </div>
      <h4 className="mt-4 font-serif text-xl">{title}</h4>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#817d74]">
        {description}
      </p>
    </div>
  );
}

function EmptySummaryState() {
  return (
    <div className="rounded-[30px] border border-dashed border-[#292a25]/15 bg-[#f8f5ec] px-6 py-16 text-center shadow-[0_15px_50px_rgba(40,40,30,.04)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#566055]">
        <WalletCards size={23} />
      </div>
      <h2 className="mt-5 font-serif text-3xl">No trips yet</h2>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#817d74]">
        Create a trip and add expenses to start building its spending summary.
      </p>
      <Link
        href="/trip/new"
        className="mt-6 inline-flex rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white"
      >
        Create a trip
      </Link>
    </div>
  );
}

function SummaryLoader({ text }: { text: string }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec]">
      <div className="text-center">
        <Loader2
          size={30}
          className="mx-auto animate-spin text-[#355244]"
        />
        <p className="mt-4 font-serif text-2xl">{text}</p>
        <p className="mt-2 text-sm text-[#817d74]">
          Reading your trip ledger.
        </p>
      </div>
    </div>
  );
}

function SummaryFrame({
  children,
  activeTripId,
}: {
  children: React.ReactNode;
  activeTripId?: string;
}) {
  return (
    <main className="min-h-screen bg-[#f4f0e6] text-[#191917]">
      <div className="flex min-h-screen">
        <TripSidebar activeTripId={activeTripId} />

        <div className="min-w-0 flex-1">
          <div className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-10">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
