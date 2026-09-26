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

export default function DashboardPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
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
        setBookings([]);
        return;
      }

      /*
       * STEP 1:
       * Load all trips from Supabase.
       *
       * The dashboard still displays all trips,
       * while the dedicated My Trips page at /trips
       * is now the main place for opening a specific trip.
       */
      const {
  data: tripData,
  error: tripError,
} = await supabase
  .from("trips")
  .select("*")
  .eq("created_by", user.id)
  .order("created_at", { ascending: false });

      if (tripError) {
        throw tripError;
      }

      const loadedTrips =
        (tripData ?? []) as Trip[];

      setTrips(loadedTrips);

      /*
       * There is no trip yet.
       *
       * Clear dependent dashboard information.
       */
      if (loadedTrips.length === 0) {
        setMembers([]);
        setExpenses([]);
        setBookings([]);
        return;
      }

      /*
       * The newest trip is still used for the
       * dashboard summary and preview sections.
       *
       * This does NOT control the My Trips page.
       */
      const activeTripId =
        loadedTrips[0].id;

      const [
        memberResult,
        expenseResult,
        bookingResult,
      ] = await Promise.all([
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

      if (memberResult.error) {
        console.warn(
          "Could not load trip members:",
          memberResult.error
        );
      }

      if (expenseResult.error) {
        console.warn(
          "Could not load expenses:",
          expenseResult.error
        );
      }

      if (bookingResult.error) {
        console.warn(
          "Could not load bookings:",
          bookingResult.error
        );
      }

      setMembers(
        (memberResult.data ?? []) as unknown as TripMember[]
      );

      setExpenses(
        (expenseResult.data ?? []) as Expense[]
      );

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

  async function refreshDashboard() {
    setRefreshing(true);

    await Promise.all([
      loadDashboard(),
      loadCurrentUser(),
    ]);

    setRefreshing(false);
  }

  const activeTrip = trips[0] ?? null;

  const activeTripId =
    activeTrip?.id ?? null;

  /*
   * The dashboard now points users to the
   * dedicated My Trips page.
   *
   * The individual trip page is still used for
   * the active trip preview/tool sections.
   */
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

  const totalExpenses = useMemo(() => {
    return expenses.reduce(
      (sum, expense) =>
        sum +
        Number(expense.amount || 0),
      0
    );
  }, [expenses]);

  const totalBookings = useMemo(() => {
    return bookings.reduce(
      (sum, booking) =>
        sum +
        Number(booking.amount || 0),
      0
    );
  }, [bookings]);

  const totalTripSpend =
    totalExpenses + totalBookings;

  const displayedExpenses =
    expenses.slice(0, 5);

  const displayName =
    currentUser?.name || "Traveler";

  const displayInitial =
    displayName
      .charAt(0)
      .toUpperCase() || "T";

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[#f4f0e6] text-[#191917]">
      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 -z-10">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(31,39,34,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(31,39,34,.055) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />

        <div className="absolute right-0 top-20 h-[500px] w-[500px] rounded-full bg-[#d8d0bd]/30 blur-3xl" />

        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-[#cfd7c6]/30 blur-3xl" />
      </div>

      {/* HEADER */}

      <header className="sticky top-0 z-50 flex h-[86px] border-b border-[#292a25]/10 bg-[#f4f0e6]/95 backdrop-blur-xl">
        <aside className="hidden w-[294px] shrink-0 border-r border-[#292a25]/10 bg-[#f8f5ec] lg:flex">
          <Link
            href="/dashboard"
            className="flex h-[86px] items-center gap-3 px-8"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#191a18] font-serif text-xl font-bold text-[#f4f0e6]">
              T
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
          <div>
            <p className="text-xs text-[#858176]">
              Workspace
            </p>

            <h1 className="text-base font-bold">
              Dashboard
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refreshDashboard}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#292a25]/15 bg-[#f8f5ec] transition hover:bg-white"
              title="Refresh dashboard"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
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
                  src={currentUser.avatar_url}
                  alt=""
                  className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#dce6fb] font-bold">
                  {displayInitial}
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
                  src={currentUser.avatar_url}
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
              className="lg:hidden"
              onClick={() =>
                setMobileMenu(!mobileMenu)
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
        {/* SIDEBAR */}

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

            {/* My Trips now opens the dedicated trips page */}
            <SidebarItem
              href={myTripsHref}
              icon={<MapPin size={19} />}
            >
              My Trips
            </SidebarItem>
          </nav>

          <div className="mt-8 rounded-[22px] bg-[#203a31] p-5 text-[#f3efe5]">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#486258]">
              <Sparkles size={18} />
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

          <div className="mt-auto border-t border-[#292a25]/10 pt-5">
            <SidebarItem
              href="/profile"
              icon={<User size={19} />}
            >
              Profile
            </SidebarItem>

            <SidebarItem
              href="/dashboard"
              icon={<Settings size={19} />}
            >
              Settings
            </SidebarItem>
          </div>
        </aside>

        {/* MOBILE MENU */}

        {mobileMenu && (
          <div className="absolute left-0 right-0 top-[86px] z-40 border-b border-[#292a25]/10 bg-[#f8f5ec] p-4 shadow-lg lg:hidden">
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

              {/* My Trips now opens /trips */}
              <SidebarItem
                href={myTripsHref}
                icon={<MapPin size={18} />}
              >
                My Trips
              </SidebarItem>

              <SidebarItem
                href="/profile"
                icon={<User size={18} />}
              >
                Profile
              </SidebarItem>

              <SidebarItem
                href="/dashboard"
                icon={<Settings size={18} />}
              >
                Settings
              </SidebarItem>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}

        <section className="min-w-0 flex-1 px-5 py-8 md:px-9 md:py-11">
          {error && (
            <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              <span>{error}</span>

              <button
                type="button"
                onClick={refreshDashboard}
                className="font-bold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* HERO */}

          <div className="relative overflow-hidden rounded-[34px] border border-[#292a25]/10 bg-[#f8f5ec] p-7 shadow-[0_18px_60px_rgba(40,40,30,.06)] md:p-10 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_.72fr] lg:items-center">
              <div>
                <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.18em] text-[#927543]">
                  <span className="h-px w-7 bg-[#b8a476]" />
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
                  {displayName}. TripWise turns messy
                  group expenses into a clear story —
                  from receipt to fair split to settlement.
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/trip/new"
                    className="inline-flex items-center gap-3 rounded-full bg-[#191a18] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#2b302c]"
                  >
                    <Plus size={15} />
                    Start a trip
                    <ArrowRight size={15} />
                  </Link>

                  {/* Opens dedicated My Trips page */}
                  <Link
                    href={myTripsHref}
                    className="inline-flex items-center gap-2 rounded-full border border-[#292a25]/20 px-6 py-3.5 text-sm font-bold transition hover:bg-white"
                  >
                    See my trips
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </div>

              {/* TRIP LEDGER CARD */}

              <div className="rounded-[30px] border border-[#cfc8b6] bg-[#f2eee3] p-3 shadow-[0_20px_60px_rgba(48,48,38,.12)]">
                <div className="rounded-[25px] bg-[#203a31] p-6 text-[#f3efe5]">
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#c7d1c4]">
                        Trip ledger
                      </p>

                      <h3 className="mt-3 font-serif text-3xl">
                        {activeTrip
                          ? activeTrip.destination ||
                            activeTrip.name
                          : "Your next trip"}
                      </h3>
                    </div>

                    <span className="h-fit rounded-full border border-white/15 px-3 py-1 text-[10px]">
                      {activeTrip
                        ? `${members.length} people`
                        : "No trip yet"}
                    </span>
                  </div>

                  <div className="mt-6 rounded-2xl bg-[#f4f0e6] p-5 text-[#191917]">
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#927543]">
                      Your trip spend
                    </p>

                    <p className="mt-2 font-serif text-4xl font-bold">
                      {formatMoney(totalTripSpend)}
                    </p>

                    <p className="mt-2 text-xs text-[#77736a]">
                      {expenses.length} expenses ·{" "}
                      {bookings.length} bookings
                    </p>
                  </div>

                  <div className="mt-4 flex justify-between text-xs text-[#c4cdc7]">
                    <span>
                      {expenses.length} expenses added
                    </span>

                    {activeTripId && (
                      <Link
                        href={expensesHref}
                        className="font-bold text-[#d8c997]"
                      >
                        View ledger →
                      </Link>
                    )}
                  </div>
                </div>

                <Link
                  href="/trip/new"
                  className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-[#191a18] py-4 text-sm font-bold text-white transition hover:bg-[#2b302c]"
                >
                  + Start a trip ↗
                </Link>
              </div>
            </div>
          </div>

          {/* STATS */}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat
              icon={<MapPin />}
              label="Your Trips"
              value={String(trips.length)}
              sub="Trips in your workspace"
            />

            <Stat
              icon={<WalletCards />}
              label="Total Spend"
              value={formatMoney(totalTripSpend)}
              sub="Expenses + bookings"
            />

            <Stat
              icon={<Users />}
              label="Travelers"
              value={String(members.length)}
              sub="Participants in active trip"
            />

            {/* Replaced standalone Settlement card with Bookings */}
            <Stat
              icon={<Hotel />}
              label="Bookings"
              value={String(bookings.length)}
              sub="Bookings in active trip"
            />
          </div>

          {/* YOUR TRIPS */}

          <div className="mt-12">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
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
                className="rounded-full border border-[#292a25]/15 px-4 py-2 text-xs font-bold transition hover:bg-white"
              >
                View all trips
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {trips.length === 0 ? (
                <EmptyTrips />
              ) : (
                trips.map((trip) => (
                  <TripRow
                    key={trip.id}
                    trip={trip}
                    expenses={expenses.filter(
                      (expense) =>
                        expense.trip_id === trip.id
                    )}
                    bookings={bookings.filter(
                      (booking) =>
                        booking.trip_id === trip.id
                    )}
                  />
                ))
              )}
            </div>
          </div>

          {/* RECENT EXPENSES */}

          <div className="mt-12 grid gap-10 xl:grid-cols-[1.5fr_.8fr]">
            <div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
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
                    href={expensesHref}
                    className="text-xs font-bold text-[#355244]"
                  >
                    View all →
                  </Link>
                )}
              </div>

              <div className="mt-5 overflow-hidden rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec]">
                {displayedExpenses.length === 0 ? (
                  <div className="p-10 text-center">
                    <Receipt
                      className="mx-auto text-[#9b968a]"
                      size={30}
                    />

                    <p className="mt-4 font-bold">
                      No expenses yet
                    </p>

                    <p className="mt-1 text-xs text-[#8b877d]">
                      Add an expense from your trip's
                      Expenses page.
                    </p>

                    {activeTripId && (
                      <Link
                        href={expensesHref}
                        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#191a18] px-4 py-2.5 text-xs font-bold text-white"
                      >
                        Add Expense
                        <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                ) : (
                  displayedExpenses.map(
                    (expense, index) => (
                      <ExpenseRow
                        key={expense.id}
                        expense={expense}
                        index={index}
                      />
                    )
                  )
                )}
              </div>
            </div>

            <div className="rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-6">
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                Current trip
              </p>

              <h2 className="mt-2 font-serif text-3xl">
                {activeTrip?.name ||
                  "No active trip"}
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#817d74]">
                Open the trip to manage everything
                belonging specifically to this journey.
              </p>

              {activeTripId && (
                <Link
                  href={tripHref}
                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#191a18] px-5 py-3 text-xs font-bold text-white"
                >
                  Open trip
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}

          <section className="mt-14 border-t border-[#292a25]/10 pt-12">
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
              Quick Actions
            </p>

            <h2 className="mt-2 font-serif text-3xl">
              Jump straight into your trip workflow
            </h2>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                href="/trip/new"
                icon="🧳"
                title="Create Trip"
                description="Start a new group adventure"
                accent="blue"
              />

              <QuickAction
                href={myTripsHref}
                icon="🗺️"
                title="My Trips"
                description="View all trips in your account"
                accent="indigo"
              />

              <QuickAction
                href={bookingsHref}
                icon="🏨"
                title="Bookings"
                description="Open bookings for your current trip"
                accent="violet"
              />

              <QuickAction
                href={itineraryHref}
                icon="📅"
                title="Itinerary"
                description="Open the current trip itinerary"
                accent="cyan"
              />
            </div>
          </section>

          {/* TRIP TOOLS */}

          <section className="mt-10 grid gap-4 md:grid-cols-3">
            <FeatureLink
              href={bookingsHref}
              icon={<Hotel size={20} />}
              title="Bookings"
              description="Hotels, transport and reservations"
            />

            <FeatureLink
              href={itineraryHref}
              icon={<CalendarDays size={20} />}
              title="Itinerary"
              description="Plan activities and trip days"
            />

            <FeatureLink
              href={tripHref}
              icon={<MapPin size={20} />}
              title="Trip Overview"
              description="Open your complete trip dashboard"
            />
          </section>

          {/* SMART MANAGEMENT */}

          <section className="mt-10 rounded-[28px] border border-[#cdd8ec] bg-[#eef5ff] p-6 md:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[#203a31] shadow-sm">
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
                  className="shrink-0 font-bold text-[#355244]"
                >
                  Open trip →
                </Link>
              )}
            </div>
          </section>
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
      className={`flex items-center gap-4 rounded-[17px] px-4 py-3.5 text-sm font-bold transition ${
        active
          ? "bg-[#191a18] text-white shadow-md"
          : "text-[#68655d] hover:bg-[#ebe7dc]"
      }`}
    >
      {icon}
      {children}
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
    <div className="rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 transition hover:-translate-y-1">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055]">
        {icon}
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
        sum + Number(expense.amount || 0),
      0
    );

  const bookingTotal =
    bookings.reduce(
      (sum, booking) =>
        sum + Number(booking.amount || 0),
      0
    );

  const total =
    expenseTotal + bookingTotal;

  return (
    <Link
      href={`/trip/${trip.id}`}
      className="group flex flex-col justify-between gap-5 rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 transition hover:-translate-y-1 hover:bg-white sm:flex-row sm:items-center"
    >
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-[#e6e2d6] text-2xl">
          🌴
        </div>

        <div>
          <h3 className="font-serif text-2xl">
            {trip.name}
          </h3>

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#817d74]">
            {trip.destination && (
              <span className="flex items-center gap-1">
                <MapPin size={13} />
                {trip.destination}
              </span>
            )}

            <span className="flex items-center gap-1">
              <CalendarDays size={13} />
              {formatDateRange(
                trip.start_date,
                trip.end_date
              )}
            </span>

            <span className="flex items-center gap-1">
              <Users size={13} />
              {expenses.length > 0 ||
              bookings.length > 0
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
            {formatMoney(total)}
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#292a25]/10">
          <ChevronRight size={17} />
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7e4d8] text-[#566055]">
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
            Number(expense.amount)
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
/* QUICK ACTION                                                            */
/* ======================================================================= */

function QuickAction({
  href,
  icon,
  title,
  description,
  accent,
}: {
  href: string;
  icon: string;
  title: string;
  description: string;
  accent:
    | "blue"
    | "indigo"
    | "violet"
    | "cyan";
}) {
  const accentStyles = {
    blue:
      "hover:border-blue-200 hover:bg-blue-50/50",
    indigo:
      "hover:border-indigo-200 hover:bg-indigo-50/50",
    violet:
      "hover:border-violet-200 hover:bg-violet-50/50",
    cyan:
      "hover:border-cyan-200 hover:bg-cyan-50/50",
  };

  return (
    <Link
      href={href}
      className={`group relative overflow-hidden rounded-[22px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_10px_35px_rgba(15,23,42,0.035)] transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${accentStyles[accent]}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8e5d9] text-xl transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
          {icon}
        </div>

        <ArrowUpRight
          size={16}
          className="text-[#aaa59a] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#191917]"
        />
      </div>

      <p className="mt-4 text-sm font-extrabold">
        {title}
      </p>

      <p className="mt-1 text-xs leading-5 text-[#817d74]">
        {description}
      </p>
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
      className="group rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 transition hover:-translate-y-1 hover:bg-white"
    >
      <div className="flex items-center justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#e8e5d9] text-[#355244]">
          {icon}
        </div>

        <ArrowUpRight
          size={17}
          className="text-[#aaa59a] transition group-hover:text-[#191917]"
        />
      </div>

      <h3 className="mt-6 font-bold">
        {title}
      </h3>

      <p className="mt-2 text-xs text-[#817d74]">
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

      <div className="relative">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e5e2d6] text-3xl">
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
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#191a18] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2b302c]"
        >
          <Plus size={15} />
          Create your first trip
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

function formatDateRange(
  start: string | null,
  end: string | null
) {
  if (!start && !end) {
    return "Dates not set";
  }

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  const startDate = start
    ? new Date(start).toLocaleDateString(
        "en-IN",
        options
      )
    : "";

  const endDate = end
    ? new Date(end).toLocaleDateString(
        "en-IN",
        options
      )
    : "";

  if (startDate && endDate) {
    return `${startDate} → ${endDate}`;
  }

  return startDate || endDate;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(
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
    return <Utensils size={17} />;
  }

  if (
    value.includes("hotel") ||
    value.includes("stay") ||
    value.includes("accommodation")
  ) {
    return <Hotel size={17} />;
  }

  if (
    value.includes("taxi") ||
    value.includes("transport") ||
    value.includes("travel")
  ) {
    return <Car size={17} />;
  }

  if (
    value.includes("activity") ||
    value.includes("ticket") ||
    value.includes("event")
  ) {
    return <Ticket size={17} />;
  }

  return <Receipt size={17} />;
}