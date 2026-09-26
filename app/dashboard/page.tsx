"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Car,
  ChevronRight,
  Hotel,
  LayoutDashboard,
  Loader2,
  MapPin,
  Menu,
  Plus,
  PieChart,
  Receipt,
  RefreshCw,
  Settings,
  Sparkles,
  Ticket,
  User,
  Users,
  Utensils,
  WalletCards,
  X,
  Compass,
  Plane,
  Navigation,
} from "lucide-react";

import {
  getCurrentUser,
  getSupabase,
} from "@/lib/supabase";

type Trip = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
};

type TripMember = {
  id: string;
  trip_id: string;
  user_id: string;
  role: string;
  profile?: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
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

type Booking = {
  id: string;
  trip_id: string;
  title: string;
  type: string | null;
  vendor: string | null;
  amount: number | null;
  paid_by: string | null;
  booking_date: string | null;
  status: string | null;
};

type CurrentUser = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
};

type SpendingCategory = {
  category: string;
  amount: number;
  percentage: number;
};

type YearlySpending = {
  year: string;
  total: number;
  categories: SpendingCategory[];
};

/* ======================================================================= */
/* SPENDING COLORS                                                         */
/* ======================================================================= */

const SPENDING_COLORS = [
  "#355244",
  "#927543",
  "#6f8068",
  "#b07a52",
  "#5f7280",
  "#8b6f83",
  "#6d7650",
  "#9a8061",
  "#4f6970",
  "#8c7658",
];

/* ======================================================================= */
/* MAIN DASHBOARD                                                          */
/* ======================================================================= */

export default function DashboardPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  /*
   * IMPORTANT:
   *
   * allExpenses = only expenses PAID BY the logged-in user.
   *
   * This is intentionally separate from "expenses".
   *
   * "expenses" remains active-trip-wide so that:
   * - Recent Expenses
   * - Trip Rows
   * - Trip Ledger
   * continue showing the complete trip data.
   *
   * "allExpenses" is used only for the user's personal
   * spending analytics.
   */
  const [allExpenses, setAllExpenses] =
    useState<Expense[]>([]);

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
    loadCurrentUser();
  }, []);

  /* ===================================================================== */
  /* CURRENT USER                                                           */
  /* ===================================================================== */

  async function loadCurrentUser() {
    try {
      const user = await getCurrentUser();

      if (!user) {
        setCurrentUser(null);
        return;
      }

      const supabase = getSupabase();

      const { data } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      setCurrentUser({
        id: user.id,
        name:
          data?.name ||
          user.name ||
          "Traveler",
        email:
          data?.email ||
          user.email ||
          "",
        avatar_url:
          data?.avatar_url ||
          user.avatar_url ||
          user.avatar ||
          null,
      });
    } catch (error) {
      console.warn(
        "Could not load current user:",
        error
      );

      setCurrentUser(null);
    }
  }

  /* ===================================================================== */
  /* LOAD DASHBOARD                                                        */
  /* ===================================================================== */

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const supabase = getSupabase();
      const user = await getCurrentUser();

      if (!user) {
        setTrips([]);
        setMembers([]);
        setExpenses([]);
        setAllExpenses([]);
        setBookings([]);
        return;
      }

      /* --------------------------------------------------------------- */
      /* LOAD USER'S TRIPS                                               */
      /* --------------------------------------------------------------- */

      const {
        data: tripData,
        error: tripError,
      } = await supabase
        .from("trips")
        .select("*")
        .eq("created_by", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (tripError) {
        throw tripError;
      }

      const loadedTrips =
        (tripData ?? []) as Trip[];

      setTrips(loadedTrips);

      if (loadedTrips.length === 0) {
        setMembers([]);
        setExpenses([]);
        setAllExpenses([]);
        setBookings([]);
        return;
      }

      const activeTripId =
        loadedTrips[0].id;

      const allTripIds =
        loadedTrips.map(
          (trip) => trip.id
        );

      /* --------------------------------------------------------------- */
      /* LOAD DATA                                                       */
      /* --------------------------------------------------------------- */

      const [
        memberResult,
        activeExpenseResult,
        personalExpenseResult,
        bookingResult,
      ] = await Promise.all([
        /*
         * ACTIVE TRIP MEMBERS
         */
        supabase
          .from("trip_members")
          .select(`
            id,
            trip_id,
            user_id,
            role,
            profiles (
              id,
              name,
              email
            )
          `)
          .eq("trip_id", activeTripId),

        /*
         * ACTIVE TRIP EXPENSES
         *
         * IMPORTANT:
         *
         * This intentionally does NOT use paid_by.
         *
         * The trip page/dashboard ledger needs to see
         * expenses from all members of the active trip.
         */
        supabase
          .from("expenses")
          .select(`
            id,
            trip_id,
            title,
            amount,
            paid_by,
            category,
            expense_date,
            created_at
          `)
          .eq("trip_id", activeTripId)
          .order("created_at", {
            ascending: false,
          }),

        /*
         * PERSONAL EXPENSES
         *
         * IMPORTANT:
         *
         * This is the query used by:
         * - My Total Spend
         * - Yearly Spending
         * - Yearly Pie Charts
         *
         * Only expenses PAID BY the logged-in user
         * are included.
         *
         * This prevents other trip members' expenses
         * from appearing in the user's personal analytics.
         */
        supabase
          .from("expenses")
          .select(`
            id,
            trip_id,
            title,
            amount,
            paid_by,
            category,
            expense_date,
            created_at
          `)
          .in(
            "trip_id",
            allTripIds
          )
          .eq(
            "paid_by",
            user.id
          )
          .order("created_at", {
            ascending: false,
          }),

        /*
         * ACTIVE TRIP BOOKINGS
         */
        supabase
          .from("bookings")
          .select(`
            id,
            trip_id,
            title,
            type,
            vendor,
            amount,
            paid_by,
            booking_date,
            status
          `)
          .eq("trip_id", activeTripId)
          .order("created_at", {
            ascending: false,
          }),
      ]);

      /* --------------------------------------------------------------- */
      /* MEMBER RESULT                                                   */
      /* --------------------------------------------------------------- */

      if (memberResult.error) {
        console.warn(
          "Could not load trip members:",
          memberResult.error
        );
      }

      /* --------------------------------------------------------------- */
      /* ACTIVE EXPENSE RESULT                                           */
      /* --------------------------------------------------------------- */

      if (activeExpenseResult.error) {
        console.warn(
          "Could not load active trip expenses:",
          activeExpenseResult.error
        );
      }

      /* --------------------------------------------------------------- */
      /* PERSONAL EXPENSE RESULT                                         */
      /* --------------------------------------------------------------- */

      if (personalExpenseResult.error) {
        console.warn(
          "Could not load personal expenses:",
          personalExpenseResult.error
        );
      }

      /* --------------------------------------------------------------- */
      /* BOOKING RESULT                                                  */
      /* --------------------------------------------------------------- */

      if (bookingResult.error) {
        console.warn(
          "Could not load bookings:",
          bookingResult.error
        );
      }

      const loadedActiveExpenses =
        (activeExpenseResult.data ?? []) as Expense[];

      const loadedPersonalExpenses =
        (personalExpenseResult.data ?? []) as Expense[];

      /* --------------------------------------------------------------- */
      /* ACTIVE TRIP EXPENSES                                            */
      /* --------------------------------------------------------------- */

      setExpenses(
        loadedActiveExpenses
      );

      /* --------------------------------------------------------------- */
      /* PERSONAL EXPENSES                                               */
      /* --------------------------------------------------------------- */

      /*
       * This state now contains ONLY:
       *
       * expense.paid_by === loggedInUser.id
       *
       * across all trips created by the logged-in user.
       */
      setAllExpenses(
        loadedPersonalExpenses
      );

      /* --------------------------------------------------------------- */
      /* MEMBERS                                                         */
      /* --------------------------------------------------------------- */

      setMembers(
        (memberResult.data ?? []) as unknown as TripMember[]
      );

      /* --------------------------------------------------------------- */
      /* BOOKINGS                                                        */
      /* --------------------------------------------------------------- */

      setBookings(
        (bookingResult.data ?? []) as Booking[]
      );
    } catch (err) {
      console.error(
        "Dashboard loading error:",
        err
      );

      setError(
        "Unable to load dashboard data. Please check your Supabase configuration."
      );
    } finally {
      setLoading(false);
    }
  }

  /* ===================================================================== */
  /* REFRESH                                                              */
  /* ===================================================================== */

  async function refreshDashboard() {
    setRefreshing(true);

    await Promise.all([
      loadDashboard(),
      loadCurrentUser(),
    ]);

    setRefreshing(false);
  }

  /* ===================================================================== */
  /* ACTIVE TRIP                                                          */
  /* ===================================================================== */

  const activeTrip =
    trips[0] ?? null;

  const activeTripId =
    activeTrip?.id ?? null;

  const myTripsHref = "/trips";

  const tripHref = activeTripId
    ? `/trip/${activeTripId}`
    : "/trip/new";

  const expensesHref = activeTripId
    ? `/trip/${activeTripId}/expenses`
    : "#";

  const bookingsHref = activeTripId
    ? `/trip/${activeTripId}/bookings`
    : "#";

  const itineraryHref = activeTripId
    ? `/trip/${activeTripId}/itinerary`
    : "#";

  /* ===================================================================== */
  /* ACTIVE TRIP EXPENSE TOTAL                                            */
  /* ===================================================================== */

  /*
   * These totals are intentionally trip-wide.
   *
   * They are used for the active trip ledger and
   * should include all members' expenses.
   */

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount || 0),
      0
    );
  }, [expenses]);

  const totalBookings = useMemo(() => {
    return bookings.reduce(
      (sum, booking) =>
        sum + Number(booking.amount || 0),
      0
    );
  }, [bookings]);

  const totalTripSpend =
    totalExpenses + totalBookings;

  /* ===================================================================== */
  /* PERSONAL TOTAL SPENDING                                              */
  /* ===================================================================== */

  /*
   * IMPORTANT:
   *
   * This is the logged-in user's total expense amount
   * across all of their trips.
   *
   * Because allExpenses is already filtered by:
   *
   * .eq("paid_by", user.id)
   *
   * this number cannot include expenses paid by other
   * trip members.
   */

  const personalTotalSpend = useMemo(() => {
    return allExpenses.reduce(
      (sum, expense) =>
        sum + Number(expense.amount || 0),
      0
    );
  }, [allExpenses]);

  /* ===================================================================== */
  /* YEARLY SPENDING DATA                                                  */
  /* ===================================================================== */

  /*
   * The yearly spending report uses allExpenses,
   * NOT expenses.
   *
   * allExpenses contains only the logged-in user's
   * expenses.
   *
   * Therefore the pie chart and yearly totals are also
   * personal to the logged-in user.
   */

  const yearlySpending =
    useMemo<YearlySpending[]>(() => {
      const yearMap =
        new Map<
          string,
          Map<string, number>
        >();

      allExpenses.forEach(
        (expense) => {
          const amount =
            Number(
              expense.amount || 0
            );

          if (
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            return;
          }

          /*
           * Prefer expense_date because the report
           * should be based on when the expense happened.
           *
           * created_at is used only when expense_date
           * is not available.
           */
          const dateValue =
            expense.expense_date ||
            expense.created_at;

          if (!dateValue) {
            return;
          }

          const date =
            new Date(dateValue);

          const yearNumber =
            date.getFullYear();

          if (
            !Number.isFinite(
              yearNumber
            )
          ) {
            return;
          }

          const year =
            String(yearNumber);

          /*
           * Use the category stored in Supabase.
           *
           * Empty/null categories are grouped
           * under "Other".
           */
          const category =
            expense.category?.trim() ||
            "Other";

          if (!yearMap.has(year)) {
            yearMap.set(
              year,
              new Map<
                string,
                number
              >()
            );
          }

          const categoryMap =
            yearMap.get(year)!;

          categoryMap.set(
            category,
            (categoryMap.get(
              category
            ) || 0) + amount
          );
        }
      );

      return Array.from(
        yearMap.entries()
      )
        .map(
          ([
            year,
            categoryMap,
          ]) => {
            const total =
              Array.from(
                categoryMap.values()
              ).reduce(
                (sum, value) =>
                  sum + value,
                0
              );

            const categories =
              Array.from(
                categoryMap.entries()
              )
                .map(
                  ([
                    category,
                    amount,
                  ]) => ({
                    category,
                    amount,
                    percentage:
                      total > 0
                        ? (amount /
                            total) *
                          100
                        : 0,
                  })
                )
                .sort(
                  (a, b) =>
                    b.amount -
                    a.amount
                );

            return {
              year,
              total,
              categories,
            };
          }
        )
        .sort(
          (a, b) =>
            Number(b.year) -
            Number(a.year)
        );
    }, [allExpenses]);

  /* ===================================================================== */
  /* PERSONAL ANALYTICS TOTAL                                             */
  /* ===================================================================== */

  /*
   * This total is calculated from the same filtered
   * yearly data used by the pie charts.
   *
   * This gives us one consistent source of truth
   * for personal spending analytics.
   */

  const personalAnalyticsTotal =
    useMemo(() => {
      return yearlySpending.reduce(
        (sum, year) =>
          sum + year.total,
        0
      );
    }, [yearlySpending]);

  /* ===================================================================== */
  /* DISPLAY DATA                                                          */
  /* ===================================================================== */

  const displayedExpenses =
    expenses.slice(0, 5);

  const displayName =
    currentUser?.name ||
    "Traveler";

  const displayInitial =
    displayName
      .charAt(0)
      .toUpperCase() || "T";

  /* ===================================================================== */
  /* LOADING                                                               */
  /* ===================================================================== */

  if (loading) {
    return <DashboardSkeleton />;
  }

  /* ===================================================================== */
  /* PAGE                                                                  */
  /* ===================================================================== */

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f0e6] text-[#191917]">

      {/* ============================================================= */}
      {/* TRAVEL MOTION SYSTEM                                         */}
      {/* ============================================================= */}

      <style jsx global>{`
        @keyframes tripFloat {
          0%,
          100% {
            transform: translateY(0px);
          }

          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes tripFloatSlow {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }

          50% {
            transform: translateY(-13px) rotate(2deg);
          }
        }

        @keyframes tripPlane {
          0% {
            transform: translateX(-80px) translateY(8px);
            opacity: 0;
          }

          10% {
            opacity: 1;
          }

          50% {
            transform: translateX(180px) translateY(-12px);
            opacity: 1;
          }

          90% {
            opacity: 1;
          }

          100% {
            transform: translateX(430px) translateY(-35px);
            opacity: 0;
          }
        }

        @keyframes tripPulse {
          0%,
          100% {
            transform: scale(0.9);
            opacity: 0.35;
          }

          50% {
            transform: scale(1.15);
            opacity: 0.8;
          }
        }

        @keyframes tripDash {
          to {
            stroke-dashoffset: -28;
          }
        }

        @keyframes tripSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes tripShimmer {
          0% {
            transform: translateX(-120%);
          }

          100% {
            transform: translateX(120%);
          }
        }

        .trip-float {
          animation: tripFloat 5s ease-in-out infinite;
        }

        .trip-float-slow {
          animation: tripFloatSlow 7s ease-in-out infinite;
        }

        .trip-plane {
          animation: tripPlane 11s linear infinite;
        }

        .trip-pulse {
          animation: tripPulse 2.8s ease-in-out infinite;
        }

        .trip-dash {
          stroke-dasharray: 7 10;
          animation: tripDash 2.5s linear infinite;
        }

        .trip-spin {
          animation: tripSpin 22s linear infinite;
        }

        .trip-shimmer {
          animation: tripShimmer 4s ease-in-out infinite;
        }
      `}</style>

      {/* ============================================================= */}
      {/* BACKGROUND                                                    */}
      {/* ============================================================= */}

      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">

        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(31,39,34,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(31,39,34,.055) 1px, transparent 1px)",
            backgroundSize:
              "46px 46px",
          }}
        />

        <div className="absolute right-[-160px] top-20 h-[500px] w-[500px] rounded-full bg-[#d8d0bd]/30 blur-3xl" />

        <div className="absolute bottom-[-120px] left-[-100px] h-[420px] w-[420px] rounded-full bg-[#cfd7c6]/30 blur-3xl" />

        <div className="absolute left-[8%] top-[22%] h-1.5 w-1.5 rounded-full bg-[#927543]/40 trip-pulse" />

        <div
          className="absolute right-[13%] top-[35%] h-2 w-2 rounded-full bg-[#355244]/30 trip-pulse"
          style={{
            animationDelay: "1s",
          }}
        />

        <div
          className="absolute bottom-[20%] left-[28%] h-1.5 w-1.5 rounded-full bg-[#927543]/30 trip-pulse"
          style={{
            animationDelay: "1.5s",
          }}
        />
      </div>

      {/* ============================================================= */}
      {/* HEADER                                                        */}
      {/* ============================================================= */}

      <header className="sticky top-0 z-50 flex h-[86px] border-b border-[#292a25]/10 bg-[#f4f0e6]/95 backdrop-blur-xl">

        <aside className="hidden w-[294px] shrink-0 border-r border-[#292a25]/10 bg-[#f8f5ec] lg:flex">

          <Link
            href="/dashboard"
            className="group flex h-[86px] items-center gap-3 px-8"
          >
            <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-[#191a18] font-serif text-xl font-bold text-[#f4f0e6] shadow-lg transition-transform duration-300 group-hover:rotate-6">
              T

              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-[#927543] ring-4 ring-[#f8f5ec]" />
            </span>

            <span>
              <b className="font-serif text-2xl">
                TripWise
              </b>

              <small className="block text-[10px] font-bold uppercase tracking-[.22em] text-[#927543]">
                Group travel
              </small>
            </span>
          </Link>
        </aside>

        <div className="flex flex-1 items-center justify-between px-5 md:px-8">

          <div className="relative">
            <p className="flex items-center gap-2 text-xs text-[#858176]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#927543]" />
              Workspace
            </p>

            <h1 className="text-base font-bold">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">

            <button
              type="button"
              onClick={
                refreshDashboard
              }
              className="group flex h-11 w-11 items-center justify-center rounded-2xl border border-[#292a25]/15 bg-[#f8f5ec] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
              title="Refresh dashboard"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : "transition-transform duration-500 group-hover:rotate-180"
                }
              />
            </button>

            <Link
              href="/profile"
              className="hidden items-center gap-3 rounded-2xl px-2 py-1.5 transition hover:bg-white sm:flex"
            >
              <div className="text-right">
                <b className="block text-sm">
                  {displayName}
                </b>

                <p className="text-[11px] text-[#89857a]">
                  {currentUser?.email ||
                    "TripWise member"}
                </p>
              </div>

              {currentUser?.avatar_url ? (
                <img
                  src={
                    currentUser.avatar_url
                  }
                  alt=""
                  className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-sm"
                />
              ) : (
                <div className="relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#dce6fb] font-bold shadow-sm">
                  {displayInitial}

                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#f8f5ec] bg-[#5e806c]" />
                </div>
              )}
            </Link>

            <Link
              href="/profile"
              className="flex sm:hidden"
              aria-label="Profile"
            >
              {currentUser?.avatar_url ? (
                <img
                  src={
                    currentUser.avatar_url
                  }
                  alt=""
                  className="h-11 w-11 rounded-full border-2 border-white object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#dce6fb] font-bold">
                  {displayInitial}
                </div>
              )}
            </Link>

            <button
              type="button"
              className="rounded-xl p-2 transition hover:bg-white lg:hidden"
              onClick={() =>
                setMobileMenu(
                  !mobileMenu
                )
              }
              aria-label="Toggle menu"
            >
              {mobileMenu ? (
                <X size={22} />
              ) : (
                <Menu size={22} />
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1780px]">

        {/* ============================================================= */}
        {/* SIDEBAR                                                       */}
        {/* ============================================================= */}

        <aside className="hidden w-[294px] shrink-0 border-r border-[#292a25]/10 bg-[#f8f5ec] lg:flex lg:min-h-[calc(100vh-86px)] lg:flex-col lg:px-[18px] lg:py-7">

          <p className="px-3 text-[11px] font-bold uppercase tracking-[.18em] text-[#8b877c]">
            Workspace
          </p>

          <nav className="mt-4 space-y-1">
            <SidebarItem
              href="/dashboard"
              icon={
                <LayoutDashboard size={19} />
              }
              active
            >
              Dashboard
            </SidebarItem>

            <SidebarItem
              href={myTripsHref}
              icon={<MapPin size={19} />}
            >
              My Trips
            </SidebarItem>

            <SidebarItem
              href="/summary"
              icon={<PieChart size={19} />}
            >
              Trip Summary
            </SidebarItem>
          </nav>

          {/* TRAVEL CARD */}

          <div className="relative mt-8 overflow-hidden rounded-[22px] bg-[#203a31] p-5 text-[#f3efe5]">

            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-white/10" />

            <div className="pointer-events-none absolute -bottom-16 -right-5 h-32 w-32 rounded-full border border-white/10" />

            <div className="relative">

              <div className="flex items-center justify-between">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#486258] trip-float">
                  <Sparkles size={18} />
                </div>

                <Plane
                  size={17}
                  className="rotate-12 text-[#d8c997]"
                />

              </div>

              <h3 className="mt-5 font-bold">
                Planning a new trip?
              </h3>

              <p className="mt-2 text-xs leading-5 text-[#c5cec8]">
                Start your next adventure and keep
                every expense organized.
              </p>

              <Link
                href="/trip/new"
                className="mt-4 flex items-center justify-between rounded-xl bg-[#4a655a] px-3 py-3 text-xs font-bold transition hover:bg-[#587266]"
              >
                Create trip
                <ArrowRight size={15} />
              </Link>

            </div>
          </div>

          {/* SETTINGS ONLY */}

          <div className="mt-auto border-t border-[#292a25]/10 pt-5">

            <SidebarItem
              href="/settings"
              icon={<Settings size={19} />}
            >
              Settings
            </SidebarItem>

          </div>
        </aside>

        {/* ============================================================= */}
        {/* MOBILE MENU                                                   */}
        {/* ============================================================= */}

        {mobileMenu && (
          <div className="absolute left-0 right-0 top-[86px] z-40 border-b border-[#292a25]/10 bg-[#f8f5ec] p-4 shadow-xl lg:hidden">

            <div className="grid gap-1">

              <SidebarItem
                href="/dashboard"
                icon={
                  <LayoutDashboard size={18} />
                }
                active
              >
                Dashboard
              </SidebarItem>

              <SidebarItem
                href={myTripsHref}
                icon={
                  <MapPin size={18} />
                }
              >
                My Trips
              </SidebarItem>

              <SidebarItem
              href="/dashboard"
              icon={<LayoutDashboard size={18} />}
              active
            >
              Dashboard
            </SidebarItem>

            <SidebarItem
              href={myTripsHref}
              icon={<MapPin size={18} />}
            >
              My Trips
            </SidebarItem>

            <SidebarItem
              href="/summary"
              icon={<PieChart size={18} />}
            >
              Trip Summary
            </SidebarItem>

            <SidebarItem
              href="/profile"
              icon={<User size={18} />}
            >
              Profile
            </SidebarItem>

            <SidebarItem
              href="/settings"
              icon={<Settings size={18} />}
            >
              Settings
            </SidebarItem>

            </div>
          </div>
        )}

        {/* ============================================================= */}
        {/* MAIN CONTENT                                                  */}
        {/* ============================================================= */}

        <section className="min-w-0 flex-1 px-5 py-8 md:px-9 md:py-11">

          {error && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 shadow-sm">
              <span>{error}</span>

              <button
                type="button"
                onClick={
                  refreshDashboard
                }
                className="font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* =========================================================== */}
          {/* HERO                                                        */}
          {/* =========================================================== */}

          <div className="relative overflow-hidden rounded-[36px] border border-[#292a25]/10 bg-[#f8f5ec] shadow-[0_18px_60px_rgba(40,40,30,.07)]">

            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(41,42,37,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(41,42,37,.045) 1px, transparent 1px)",
                backgroundSize:
                  "34px 34px",
                maskImage:
                  "linear-gradient(to right, black, transparent 85%)",
              }}
            />

            <svg
              className="pointer-events-none absolute right-0 top-0 hidden h-full w-[52%] opacity-40 lg:block"
              viewBox="0 0 700 500"
              fill="none"
            >
              <path
                d="M50 370 C180 290 190 410 310 320 C430 230 420 170 640 100"
                stroke="#927543"
                strokeWidth="1.5"
                className="trip-dash"
              />

              <circle
                cx="50"
                cy="370"
                r="4"
                fill="#927543"
              />

              <circle
                cx="640"
                cy="100"
                r="5"
                fill="#355244"
              />

              <circle
                cx="640"
                cy="100"
                r="13"
                stroke="#355244"
                strokeOpacity=".25"
                className="trip-pulse"
              />
            </svg>

            <div className="pointer-events-none absolute right-[30%] top-[16%] hidden lg:block">

              <div className="trip-plane flex items-center gap-2 text-[#927543]/60">

                <span className="text-[9px] font-bold uppercase tracking-[.16em]">
                  Boarding
                </span>

                <Plane
                  size={18}
                  className="rotate-12"
                />

              </div>
            </div>

            <div className="pointer-events-none absolute right-7 top-7 hidden items-center gap-2 rounded-full border border-[#292a25]/10 bg-[#f4f0e6]/80 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.16em] text-[#8b877d] backdrop-blur md:flex">

              <Navigation
                size={11}
                className="text-[#927543]"
              />

              TRIPWISE · 18.520° N
            </div>

            <div className="relative grid gap-10 p-7 md:p-10 lg:grid-cols-[1.05fr_.72fr] lg:items-center lg:p-12">

              <div>

                <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.18em] text-[#927543]">

                  <span className="relative h-px w-7 bg-[#b8a476]">
                    <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#927543]" />
                  </span>

                  GROUP TRAVEL, WITHOUT THE AWKWARD MATH

                </p>

                <h2 className="mt-7 max-w-[720px] font-serif text-[52px] leading-[.96] tracking-[-.04em] sm:text-[66px] lg:text-[72px]">

                  Make the trip
                  <br />

                  memorable.
                  <br />

                  <span className="text-[#77756f]">
                    Not the math.
                  </span>

                </h2>

                <p className="mt-7 max-w-[650px] text-[15px] leading-7 text-[#68655d]">

                  Welcome back,{" "}
                  <span className="font-bold text-[#355244]">
                    {displayName}
                  </span>
                  . TripWise turns messy
                  group expenses into a clear story —
                  from receipt to fair split to settlement.

                </p>

                <div className="mt-7 flex flex-wrap gap-3">

                  <Link
                    href="/trip/new"
                    className="group inline-flex items-center gap-3 rounded-full bg-[#191a18] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-[#2b302c] hover:shadow-xl"
                  >
                    <Plus size={15} />

                    Start a trip

                    <ArrowRight
                      size={15}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </Link>

                  <Link
                    href={myTripsHref}
                    className="group inline-flex items-center gap-2 rounded-full border border-[#292a25]/20 px-6 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                  >
                    See my trips

                    <ArrowUpRight
                      size={15}
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </Link>

                </div>

                <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[10px] font-bold uppercase tracking-[.13em] text-[#979186]">

                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5f7a6d]" />
                    Live ledger
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#927543]" />
                    Fair splits
                  </span>

                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5f7a6d]" />
                    Group ready
                  </span>

                </div>

              </div>

              {/* ======================================================= */}
              {/* TRIP LEDGER VISUAL                                      */}
              {/* ======================================================= */}

              <div className="relative">

                <div className="trip-float-slow pointer-events-none absolute -right-3 -top-5 z-20 hidden h-16 w-16 items-center justify-center rounded-full border border-[#292a25]/10 bg-[#f8f5ec]/90 shadow-lg backdrop-blur md:flex">

                  <div className="absolute inset-2 rounded-full border border-[#927543]/20" />

                  <Compass
                    size={25}
                    className="trip-spin text-[#927543]"
                  />

                </div>

                <div className="trip-float pointer-events-none absolute -left-5 bottom-14 z-20 hidden w-28 rotate-[-6deg] rounded-xl border border-[#292a25]/10 bg-white/90 p-3 shadow-xl backdrop-blur md:block">

                  <div className="flex items-center justify-between">

                    <Ticket
                      size={15}
                      className="text-[#927543]"
                    />

                    <span className="text-[7px] font-bold uppercase tracking-[.12em] text-[#99948a]">
                      TW-24
                    </span>

                  </div>

                  <div className="mt-3 h-px border-t border-dashed border-[#292a25]/15" />

                  <p className="mt-2 text-[8px] font-bold">
                    GROUP PASS
                  </p>

                  <p className="mt-1 text-[7px] text-[#8b877d]">
                    READY TO GO
                  </p>

                </div>

                <div className="rounded-[30px] border border-[#cfc8b6] bg-[#f2eee3] p-3 shadow-[0_20px_60px_rgba(48,48,38,.14)]">

                  <div className="relative overflow-hidden rounded-[25px] bg-[#203a31] p-6 text-[#f3efe5]">

                    <div className="pointer-events-none absolute inset-0 opacity-10">

                      <div className="absolute left-[15%] top-[20%] h-32 w-32 rounded-full border border-white" />

                      <div className="absolute right-[-20px] bottom-[-30px] h-44 w-44 rounded-full border border-white" />

                      <div className="absolute left-[-20px] bottom-[15%] h-px w-[70%] rotate-[-18deg] bg-white" />

                    </div>

                    <div className="relative flex justify-between gap-4">

                      <div>

                        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#c7d1c4]">

                          <MapPin size={11} />

                          Trip ledger

                        </p>

                        <h3 className="mt-3 font-serif text-3xl">
                          {activeTrip
                            ? activeTrip.destination ||
                              activeTrip.name
                            : "Your next trip"}
                        </h3>

                      </div>

                      <span className="h-fit rounded-full border border-white/15 px-3 py-1 text-[10px] backdrop-blur">

                        {activeTrip
                          ? `${members.length} people`
                          : "No trip yet"}

                      </span>

                    </div>

                    <div className="relative mt-6 overflow-hidden rounded-2xl bg-[#f4f0e6] p-5 text-[#191917]">

                      <div className="absolute right-0 top-0 h-full w-20 overflow-hidden opacity-20">

                        <div className="trip-shimmer h-full w-20 bg-gradient-to-r from-transparent via-[#927543] to-transparent" />

                      </div>

                      <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#927543]">
                        Your trip spend
                      </p>

                      <p className="mt-2 font-serif text-4xl font-bold">
                        {formatMoney(
                          totalTripSpend
                        )}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">

                        <span className="rounded-full bg-[#e8e5d9] px-2.5 py-1 text-[9px] font-bold text-[#68655d]">
                          {expenses.length} expenses
                        </span>

                        <span className="rounded-full bg-[#e8e5d9] px-2.5 py-1 text-[9px] font-bold text-[#68655d]">
                          {bookings.length} bookings
                        </span>

                      </div>

                    </div>

                    <div className="relative mt-4 flex items-center justify-between text-xs text-[#c4cdc7]">

                      <span className="flex items-center gap-2">

                        <span className="h-1.5 w-1.5 rounded-full bg-[#8cad9d]" />

                        {expenses.length} expenses added

                      </span>

                      {activeTripId && (
                        <Link
                          href={
                            expensesHref
                          }
                          className="font-bold text-[#d8c997] transition hover:text-white"
                        >
                          View ledger →
                        </Link>
                      )}

                    </div>

                  </div>

                  <Link
                    href="/trip/new"
                    className="group mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[#191a18] py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2b302c]"
                  >
                    + Start a trip ↗

                    <Plane
                      size={14}
                      className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                    />
                  </Link>

                </div>
              </div>
            </div>
          </div>

          {/* =========================================================== */}
          {/* STATS                                                       */}
          {/* =========================================================== */}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

            <Stat
              icon={<MapPin />}
              label="Your Trips"
              value={String(
                trips.length
              )}
              sub="Trips in your workspace"
            />

            {/* ======================================================= */}
            {/* PERSONAL TOTAL SPEND                                    */}
            {/* ======================================================= */}

            <Stat
              icon={<WalletCards />}
              label="My Total Spend"
              value={formatMoney(
                personalAnalyticsTotal
              )}
              sub="Your expenses across all trips"
            />

            <Stat
              icon={<Users />}
              label="Travelers"
              value={String(
                members.length
              )}
              sub="Participants in active trip"
            />

            <Stat
              icon={<Hotel />}
              label="Bookings"
              value={String(
                bookings.length
              )}
              sub="Bookings in active trip"
            />

          </div>

          {/* =========================================================== */}
          {/* YOUR TRIPS                                                  */}
          {/* =========================================================== */}

          <div className="mt-14">

            <div className="flex items-end justify-between gap-5">

              <div>

                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">

                  <span className="h-1.5 w-1.5 rounded-full bg-[#927543]" />

                  Journeys

                </p>

                <h2 className="mt-2 font-serif text-3xl">
                  Your trips
                </h2>

                <p className="mt-1 text-sm text-[#817d74]">
                  Every trip has its own expenses,
                  settlement, bookings and itinerary.
                </p>
              </div>

              <Link
                href={myTripsHref}
                className="hidden rounded-full border border-[#292a25]/15 px-4 py-2 text-xs font-bold transition hover:bg-white hover:shadow-sm sm:block"
              >
                View all trips
              </Link>

            </div>

            <div className="mt-5 space-y-4">

              {trips.length === 0 ? (
                <EmptyTrips />
              ) : (
                trips.map(
                  (trip) => (
                    <TripRow
                      key={trip.id}
                      trip={trip}
                      expenses={expenses.filter(
                        (expense) =>
                          expense.trip_id ===
                          trip.id
                      )}
                      bookings={bookings.filter(
                        (booking) =>
                          booking.trip_id ===
                          trip.id
                      )}
                    />
                  )
                )
              )}

            </div>
          </div>

          {/* =========================================================== */}
          {/* RECENT EXPENSES                                             */}
          {/* =========================================================== */}

          <div className="mt-14 grid gap-10 xl:grid-cols-[1.5fr_.8fr]">

            <div>

              <div className="flex items-end justify-between">

                <div>

                  <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">

                    <span className="h-1.5 w-1.5 rounded-full bg-[#927543]" />

                    Ledger

                  </p>

                  <h2 className="mt-2 font-serif text-3xl">
                    Recent expenses
                  </h2>

                  <p className="mt-1 text-sm text-[#817d74]">
                    Latest spending activity from the
                    active trip.
                  </p>
                </div>

                {activeTripId && (
                  <Link
                    href={
                      expensesHref
                    }
                    className="text-xs font-bold text-[#355244] transition hover:text-[#927543]"
                  >
                    View all →
                  </Link>
                )}

              </div>

              <div className="mt-5 overflow-hidden rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] shadow-[0_12px_35px_rgba(40,40,30,.035)]">

                {displayedExpenses.length ===
                0 ? (
                  <div className="p-10 text-center">

                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8e5d9]">
                      <Receipt
                        className="text-[#9b968a]"
                        size={26}
                      />
                    </div>

                    <p className="mt-4 font-bold">
                      No expenses yet
                    </p>

                    <p className="mt-1 text-xs text-[#8b877d]">
                      Add an expense from your trip's
                      Expenses page.
                    </p>

                    {activeTripId && (
                      <Link
                        href={
                          expensesHref
                        }
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#191a18] px-4 py-2.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2b302c]"
                      >
                        Add Expense
                        <ArrowRight
                          size={14}
                        />
                      </Link>
                    )}

                  </div>
                ) : (
                  displayedExpenses.map(
                    (
                      expense,
                      index
                    ) => (
                      <ExpenseRow
                        key={
                          expense.id
                        }
                        expense={
                          expense
                        }
                        index={
                          index
                        }
                      />
                    )
                  )
                )}

              </div>
            </div>

            {/* CURRENT TRIP CARD */}

            <div className="relative overflow-hidden rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_12px_35px_rgba(40,40,30,.035)]">

              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border border-[#927543]/10" />

              <div className="pointer-events-none absolute right-5 top-5">

                <div className="trip-float-slow flex h-12 w-12 items-center justify-center rounded-full border border-[#292a25]/10 bg-[#f4f0e6]">

                  <Compass
                    size={20}
                    className="text-[#927543]"
                  />

                </div>

              </div>

              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                Current trip
              </p>

              <h2 className="mt-2 max-w-[75%] font-serif text-3xl">
                {activeTrip?.name ||
                  "No active trip"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#817d74]">
                Open the trip to manage everything
                belonging specifically to this journey.
              </p>

              {activeTrip && (
                <div className="mt-6 flex flex-wrap gap-2">

                  {activeTrip.destination && (
                    <span className="flex items-center gap-1.5 rounded-full bg-[#e8e5d9] px-3 py-1.5 text-[10px] font-bold text-[#68655d]">
                      <MapPin size={11} />
                      {
                        activeTrip.destination
                      }
                    </span>
                  )}

                  <span className="flex items-center gap-1.5 rounded-full bg-[#e8e5d9] px-3 py-1.5 text-[10px] font-bold text-[#68655d]">
                    <Users size={11} />
                    {members.length} travelers
                  </span>

                </div>
              )}

              {activeTripId && (
                <Link
                  href={tripHref}
                  className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-[#191a18] px-5 py-3 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2b302c]"
                >
                  Open trip

                  <ArrowRight
                    size={14}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </Link>
              )}

            </div>
          </div>

          {/* =========================================================== */}
          {/* YEARLY PERSONAL SPENDING                                   */}
          {/* =========================================================== */}

          <section className="mt-14 border-t border-[#292a25]/10 pt-12">

            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

              <div>

                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">

                  <span className="h-1.5 w-1.5 rounded-full bg-[#927543]" />

                  Spending Analytics

                </p>

                <h2 className="mt-2 font-serif text-3xl md:text-4xl">
                  My total spending by year
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#817d74]">
                  A year-wise breakdown of
                  <span className="font-bold text-[#355244]">
                    {" "}
                    your expenses
                  </span>{" "}
                  across your trips. Only expenses
                  paid by your logged-in profile are
                  included in this report.
                </p>

              </div>

              <div className="rounded-2xl border border-[#292a25]/10 bg-[#f8f5ec] px-5 py-4">

                <p className="text-[9px] font-bold uppercase tracking-[.16em] text-[#99948a]">
                  My expenses
                </p>

                <p className="mt-1 font-serif text-2xl font-bold">
                  {formatMoney(
                    personalAnalyticsTotal
                  )}
                </p>

              </div>

            </div>

            {yearlySpending.length ===
            0 ? (
              <div className="mt-7 rounded-[28px] border border-dashed border-[#292a25]/20 bg-[#f8f5ec] p-12 text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8e5d9]">
                  <WalletCards
                    size={27}
                    className="text-[#927543]"
                  />
                </div>

                <h3 className="mt-5 font-serif text-2xl">
                  No personal spending data yet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#817d74]">
                  Add expenses that are paid by your
                  profile to see your yearly personal
                  spending report here.
                </p>

              </div>
            ) : (
              <div className="mt-7 grid gap-6 lg:grid-cols-2">

                {yearlySpending.map(
                  (yearData) => (
                    <YearlySpendingCard
                      key={
                        yearData.year
                      }
                      data={
                        yearData
                      }
                    />
                  )
                )}

              </div>
            )}

          </section>

          {/* =========================================================== */}
          {/* TRIP TOOLS                                                  */}
          {/* =========================================================== */}

          <section className="mt-10 grid gap-4 md:grid-cols-3">

            <FeatureLink
              href={
                bookingsHref
              }
              icon={
                <Hotel size={20} />
              }
              title="Bookings"
              description="Hotels, transport and reservations"
            />

            <FeatureLink
              href={
                itineraryHref
              }
              icon={
                <CalendarDays size={20} />
              }
              title="Itinerary"
              description="Plan activities and trip days"
            />

            <FeatureLink
              href={tripHref}
              icon={
                <MapPin size={20} />
              }
              title="Trip Overview"
              description="Open your complete trip dashboard"
            />

          </section>

          {/* =========================================================== */}
          {/* SMART MANAGEMENT                                            */}
          {/* =========================================================== */}

          <section className="relative mt-10 overflow-hidden rounded-[28px] border border-[#cdd8ec] bg-[#eef5ff] p-6 md:p-8">

            <div className="pointer-events-none absolute right-[-20px] top-[-50px] hidden h-44 w-80 rotate-[-8deg] opacity-30 md:block">

              <svg
                viewBox="0 0 320 150"
                className="h-full w-full"
                fill="none"
              >

                <path
                  d="M10 110 C80 30 130 140 210 70 C250 35 270 55 315 20"
                  stroke="#355244"
                  strokeWidth="1.5"
                  className="trip-dash"
                />

                <circle
                  cx="10"
                  cy="110"
                  r="4"
                  fill="#927543"
                />

                <circle
                  cx="315"
                  cy="20"
                  r="4"
                  fill="#355244"
                />

              </svg>

            </div>

            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

              <div className="flex gap-4">

                <div className="trip-float flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#203a31] shadow-sm">
                  <Sparkles size={20} />
                </div>

                <div>
                  <h2 className="font-bold text-lg">
                    Smart trip management
                  </h2>

                  <p className="mt-1 max-w-3xl text-sm leading-6 text-[#77736a]">
                    TripWise keeps expenses, bill items,
                    participants and settlements connected
                    so your group can spend less time
                    calculating and more time travelling.
                  </p>
                </div>
              </div>

              {activeTripId && (
                <Link
                  href={tripHref}
                  className="group shrink-0 font-bold text-[#355244]"
                >
                  Open trip

                  <span className="ml-1 inline-block transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              )}

            </div>
          </section>

          {/* =========================================================== */}
          {/* FOOTER DETAIL                                               */}
          {/* =========================================================== */}

          <div className="mt-12 flex items-center justify-center gap-4 text-[9px] font-bold uppercase tracking-[.22em] text-[#a19c90]">

            <span className="h-px w-12 bg-[#292a25]/10" />

            <span className="flex items-center gap-2">
              <Plane size={11} />
              Keep travelling
            </span>

            <span className="h-px w-12 bg-[#292a25]/10" />

          </div>

        </section>
      </div>
    </main>
  );
}

/* ======================================================================= */
/* SIDEBAR ITEM                                                            */
/* ======================================================================= */

function SidebarItem({
  href,
  icon,
  children,
  active = false,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex items-center gap-4 rounded-[17px] px-4 py-3.5 text-sm font-bold transition ${
        active
          ? "bg-[#191a18] text-white shadow-md"
          : "text-[#68655d] hover:bg-[#ebe7dc]"
      }`}
    >
      <span className="transition-transform duration-300 group-hover:translate-x-0.5">
        {icon}
      </span>

      {children}

      {!active && (
        <ChevronRight
          size={14}
          className="ml-auto opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-50"
        />
      )}
    </Link>
  );
}

/* ======================================================================= */
/* STAT                                                                    */
/* ======================================================================= */

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_8px_25px_rgba(40,40,30,.025)] transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_15px_35px_rgba(40,40,30,.07)]">

      <div className="absolute right-[-15px] top-[-15px] h-16 w-16 rounded-full border border-[#927543]/10 transition-transform duration-500 group-hover:scale-150" />

      <div className="relative">

        <div className="flex items-center justify-between">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            {icon}
          </div>

          <ArrowUpRight
            size={14}
            className="text-[#b0aa9e] opacity-0 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:opacity-100"
          />

        </div>

        <p className="mt-4 text-xs text-[#8b877d]">
          {label}
        </p>

        <p className="mt-1 font-serif text-2xl">
          {value}
        </p>

        <p className="mt-1 text-xs text-[#8b877d]">
          {sub}
        </p>

      </div>
    </div>
  );
}

/* ======================================================================= */
/* YEARLY SPENDING CARD                                                    */
/* ======================================================================= */

function YearlySpendingCard({
  data,
}: {
  data: YearlySpending;
}) {
  return (
    <div className="group relative overflow-hidden rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_10px_35px_rgba(40,40,30,.035)] transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_45px_rgba(40,40,30,.07)]">

      {/* DECORATIVE CIRCLE */}

      <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full border border-[#927543]/10 transition-transform duration-700 group-hover:scale-125" />

      {/* HEADER */}

      <div className="relative flex items-start justify-between gap-5">

        <div>

          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#927543]">
            Personal annual spending
          </p>

          <h3 className="mt-1 font-serif text-3xl">
            {data.year}
          </h3>

        </div>

        <div className="text-right">

          <p className="text-[9px] font-bold uppercase tracking-[.14em] text-[#99948a]">
            My Total
          </p>

          <p className="mt-1 font-serif text-xl font-bold">
            {formatMoney(
              data.total
            )}
          </p>

        </div>

      </div>

      {/* PIE + LEGEND */}

      <div className="relative mt-7 grid gap-7 sm:grid-cols-[220px_1fr] sm:items-center">

        <SpendingPie
          categories={
            data.categories
          }
          total={
            data.total
          }
        />

        <div className="min-w-0">

          <p className="mb-3 text-[9px] font-bold uppercase tracking-[.16em] text-[#99948a]">
            My category breakdown
          </p>

          <div className="space-y-3">

            {data.categories.map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    item.category
                  }
                  className="flex items-center justify-between gap-3"
                >

                  <div className="flex min-w-0 items-center gap-2">

                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          SPENDING_COLORS[
                            index %
                              SPENDING_COLORS.length
                          ],
                      }}
                    />

                    <span className="truncate text-xs font-semibold text-[#68655d]">
                      {
                        item.category
                      }
                    </span>

                  </div>

                  <div className="shrink-0 text-right">

                    <p className="text-xs font-bold">
                      {formatMoney(
                        item.amount
                      )}
                    </p>

                    <p className="text-[9px] text-[#9a958a]">
                      {item.percentage.toFixed(
                        1
                      )}
                      %
                    </p>

                  </div>

                </div>
              )
            )}

          </div>

        </div>

      </div>

      {/* FOOTER */}

      <div className="relative mt-6 flex items-center justify-between border-t border-[#292a25]/8 pt-4">

        <span className="text-[9px] font-bold uppercase tracking-[.14em] text-[#9a958a]">
          {data.categories.length} categories
        </span>

        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[.12em] text-[#355244]">
          My Expenses
          <Receipt size={11} />
        </span>

      </div>

    </div>
  );
}

/* ======================================================================= */
/* PIE CHART                                                               */
/* ======================================================================= */

function SpendingPie({
  categories,
  total,
}: {
  categories: SpendingCategory[];
  total: number;
}) {
  const gradientStops =
    useMemo(() => {
      if (
        total <= 0 ||
        categories.length === 0
      ) {
        return "";
      }

      let currentPercentage = 0;

      return categories
        .map(
          (
            item,
            index
          ) => {
            const start =
              currentPercentage;

            const percentage =
              item.percentage;

            currentPercentage +=
              percentage;

            const end =
              currentPercentage;

            const color =
              SPENDING_COLORS[
                index %
                  SPENDING_COLORS.length
              ];

            return `${color} ${start}% ${end}%`;
          }
        )
        .join(", ");
    }, [
      categories,
      total,
    ]);

  if (
    categories.length === 0 ||
    total <= 0
  ) {
    return (
      <div className="mx-auto flex h-[190px] w-[190px] items-center justify-center rounded-full bg-[#e8e5d9]">
        <span className="text-xs font-bold text-[#8b877d]">
          No data
        </span>
      </div>
    );
  }

  return (
    <div className="relative mx-auto h-[190px] w-[190px]">

      {/* PIE */}

      <div
        className="h-full w-full rounded-full shadow-[inset_0_0_0_1px_rgba(25,26,24,.06),0_12px_30px_rgba(40,40,30,.08)]"
        style={{
          background:
            `conic-gradient(${gradientStops})`,
        }}
      />

      {/* CENTER */}

      <div className="absolute inset-[30px] flex flex-col items-center justify-center rounded-full bg-[#f8f5ec] text-center shadow-[0_3px_15px_rgba(40,40,30,.08)]">

        <span className="text-[9px] font-bold uppercase tracking-[.14em] text-[#99948a]">
          My Total
        </span>

        <span className="mt-1 max-w-[95px] truncate font-serif text-lg font-bold">
          {formatCompactMoney(
            total
          )}
        </span>

        <span className="mt-1 text-[8px] text-[#99948a]">
          yearly
        </span>

      </div>

    </div>
  );
}

/* ======================================================================= */
/* TRIP ROW                                                                */
/* ======================================================================= */

function TripRow({
  trip,
  expenses,
  bookings,
}: {
  trip: Trip;
  expenses: Expense[];
  bookings: Booking[];
}) {
  const expenseTotal =
    expenses.reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );

  const bookingTotal =
    bookings.reduce(
      (sum, booking) =>
        sum +
        Number(
          booking.amount || 0
        ),
      0
    );

  const total =
    expenseTotal +
    bookingTotal;

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="group relative flex flex-col justify-between gap-5 overflow-hidden rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_8px_25px_rgba(40,40,30,.025)] transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_40px_rgba(40,40,30,.07)] sm:flex-row sm:items-center"
    >

      <div className="absolute right-0 top-0 h-full w-1 bg-[#927543] opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="flex items-center gap-4">

        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#e6e2d6] text-2xl transition-transform duration-300 group-hover:scale-105 group-hover:rotate-2">

          🌴

          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#927543]" />

        </div>

        <div>

          <h3 className="font-serif text-2xl">
            {trip.name}
          </h3>

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#817d74]">

            {trip.destination && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {
                  trip.destination
                }
              </span>
            )}

            <span className="flex items-center gap-1">
              <CalendarDays
                size={13}
              />
              {formatDateRange(
                trip.start_date,
                trip.end_date
              )}
            </span>

            <span className="flex items-center gap-1">
              <Users size={13} />

              {expenses.length >
                0 ||
              bookings.length >
                0
                ? "Active"
                : "Ready to plan"}
            </span>

          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-5 sm:justify-end">

        <div className="sm:text-right">

          <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#99948a]">
            Total spend
          </p>

          <p className="mt-1 font-serif text-2xl">
            {formatMoney(
              total
            )}
          </p>

        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#292a25]/10 transition-all duration-300 group-hover:border-[#927543]/30 group-hover:bg-[#e8e5d9]">
          <ChevronRight
            size={17}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </div>

      </div>
    </Link>
  );
}

/* ======================================================================= */
/* EXPENSE ROW                                                             */
/* ======================================================================= */

function ExpenseRow({
  expense,
  index,
}: {
  expense: Expense;
  index: number;
}) {
  return (
    <Link
      href={`/trip/${expense.trip_id}/expenses`}
      className={`group flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-white ${
        index > 0
          ? "border-t border-[#292a25]/8"
          : ""
      }`}
    >

      <div className="flex min-w-0 items-center gap-3">

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7e4d8] text-[#566055] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
          {getExpenseIcon(
            expense.category
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {expense.title}
          </p>

          <p className="mt-0.5 truncate text-[10px] text-[#8c887e]">
            {expense.category ||
              "General expense"}

            {expense.expense_date
              ? ` · ${formatDate(
                  expense.expense_date
                )}`
              : ""}
          </p>
        </div>
      </div>

      <div className="ml-3 shrink-0 text-right">

        <p className="text-sm font-extrabold">
          {formatMoney(
            Number(
              expense.amount
            )
          )}
        </p>

        <p className="mt-0.5 text-[10px] font-semibold text-[#355244] opacity-0 transition-opacity group-hover:opacity-100">
          View
        </p>
      </div>
    </Link>
  );
}

/* ======================================================================= */
/* FEATURE LINK                                                            */
/* ======================================================================= */

function FeatureLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 transition duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_15px_35px_rgba(40,40,30,.06)]"
    >

      <div className="absolute right-[-20px] top-[-20px] h-20 w-20 rounded-full border border-[#927543]/10 transition-transform duration-500 group-hover:scale-150" />

      <div className="relative flex items-center justify-between">

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8e5d9] text-[#355244] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
          {icon}
        </div>

        <ArrowUpRight
          size={17}
          className="text-[#aaa59a] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#191917]"
        />

      </div>

      <h3 className="relative mt-6 font-bold">
        {title}
      </h3>

      <p className="relative mt-2 text-xs text-[#817d74]">
        {description}
      </p>

    </Link>
  );
}

/* ======================================================================= */
/* EMPTY TRIPS                                                             */
/* ======================================================================= */

function EmptyTrips() {
  return (
    <div className="relative overflow-hidden rounded-[24px] border border-dashed border-[#292a25]/20 bg-[#f8f5ec] p-10 text-center">

      <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 rounded-full bg-[#d8d0bd]/40 blur-3xl" />

      <div className="pointer-events-none absolute left-[10%] top-[20%] hidden opacity-30 md:block">

        <svg
          width="170"
          height="80"
          viewBox="0 0 170 80"
          fill="none"
        >
          <path
            d="M5 60 C45 10 80 70 115 35 C135 15 150 25 165 8"
            stroke="#927543"
            strokeWidth="1.5"
            className="trip-dash"
          />
        </svg>

      </div>

      <div className="relative">

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e5e2d6] text-3xl trip-float">
          🧳
        </div>

        <h3 className="mt-5 font-serif text-2xl">
          Your next adventure starts here
        </h3>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#807c72]">
          Create a trip and invite your group. We'll
          keep the planning, expenses and settlements
          together.
        </p>

        <Link
          href="/trip/new"
          className="group mt-6 inline-flex items-center gap-2 rounded-xl bg-[#191a18] px-4 py-2.5 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2b302c]"
        >
          <Plus size={15} />
          Create your first trip
          <ArrowRight
            size={13}
            className="transition-transform group-hover:translate-x-1"
          />
        </Link>

      </div>
    </div>
  );
}

/* ======================================================================= */
/* DASHBOARD SKELETON                                                      */
/* ======================================================================= */

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-[#f4f0e6]">

      <div className="flex min-h-screen">

        <aside className="hidden w-[294px] border-r border-[#292a25]/10 bg-[#f8f5ec] p-7 lg:block">

          <div className="h-12 w-36 animate-pulse rounded-xl bg-[#e7e2d5]" />

          <div className="mt-10 space-y-3">

            {[1, 2].map(
              (item) => (
                <div
                  key={item}
                  className="h-12 animate-pulse rounded-xl bg-[#e7e2d5]"
                />
              )
            )}
          </div>
        </aside>

        <section className="flex-1">

          <div className="h-[86px] animate-pulse border-b border-[#292a25]/10 bg-[#f8f5ec]" />

          <div className="mx-auto max-w-[1450px] p-5 md:p-8">

            <div className="h-64 animate-pulse rounded-[34px] bg-[#f8f5ec]" />

            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-36 animate-pulse rounded-[25px] bg-[#f8f5ec]"
                  />
                )
              )}

            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_0.8fr]">

              <div className="space-y-4">

                {[1, 2, 3].map(
                  (item) => (
                    <div
                      key={item}
                      className="h-32 animate-pulse rounded-[24px] bg-[#f8f5ec]"
                    />
                  )
                )}

              </div>

              <div className="h-80 animate-pulse rounded-[24px] bg-[#f8f5ec]" />

            </div>
          </div>
        </section>
      </div>

      <div className="fixed inset-0 flex items-center justify-center">

        <div className="flex items-center gap-2 rounded-full border border-[#292a25]/10 bg-[#f8f5ec]/95 px-4 py-2 text-xs font-bold text-[#6d695f] shadow-lg backdrop-blur">

          <Loader2
            size={15}
            className="animate-spin text-[#355244]"
          />

          Loading your trips...

        </div>
      </div>
    </main>
  );
}

/* ======================================================================= */
/* HELPERS                                                                 */
/* ======================================================================= */

function formatMoney(value: number) {
  return `₹${Number(
    value || 0
  ).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactMoney(
  value: number
) {
  const number =
    Number(value) || 0;

  if (number >= 10000000) {
    return `₹${(
      number / 10000000
    ).toFixed(1)}Cr`;
  }

  if (number >= 100000) {
    return `₹${(
      number / 100000
    ).toFixed(1)}L`;
  }

  if (number >= 1000) {
    return `₹${(
      number / 1000
    ).toFixed(1)}K`;
  }

  return formatMoney(number);
}

function formatDateRange(
  start: string | null,
  end: string | null
) {
  if (!start && !end) {
    return "Dates not set";
  }

  const options: Intl.DateTimeFormatOptions =
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    };

  const startDate = start
    ? new Date(
        start
      ).toLocaleDateString(
        "en-IN",
        options
      )
    : "";

  const endDate = end
    ? new Date(
        end
      ).toLocaleDateString(
        "en-IN",
        options
      )
    : "";

  if (
    startDate &&
    endDate
  ) {
    return `${startDate} → ${endDate}`;
  }

  return (
    startDate || endDate
  );
}

function formatDate(
  value: string
) {
  return new Date(
    value
  ).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function getExpenseIcon(
  category: string | null
) {
  const value = (
    category || ""
  ).toLowerCase();

  if (
    value.includes("food") ||
    value.includes("dinner") ||
    value.includes("restaurant")
  ) {
    return (
      <Utensils size={17} />
    );
  }

  if (
    value.includes("hotel") ||
    value.includes("stay") ||
    value.includes(
      "accommodation"
    )
  ) {
    return (
      <Hotel size={17} />
    );
  }

  if (
    value.includes("taxi") ||
    value.includes(
      "transport"
    ) ||
    value.includes("travel")
  ) {
    return (
      <Car size={17} />
    );
  }

  if (
    value.includes(
      "activity"
    ) ||
    value.includes("ticket") ||
    value.includes("event")
  ) {
    return (
      <Ticket size={17} />
    );
  }

  return (
    <Receipt size={17} />
  );
}