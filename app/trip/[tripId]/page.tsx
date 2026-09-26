"use client";

import {
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Hotel,
  MapPin,
  Receipt,
  RefreshCw,
  Route,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  ArrowLeft,
} from "lucide-react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  getSupabase,
} from "@/lib/supabase";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type Trip = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
};

type Member = {
  id: string;
  trip_id: string;
  user_id: string;
  role: string | null;
  profile?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    upi_id?: string | null;
  } | null;
  profiles?:
    | {
        id?: string;
        name?: string | null;
        email?: string | null;
        avatar_url?: string | null;
        upi_id?: string | null;
      }
    | {
        id?: string;
        name?: string | null;
        email?: string | null;
        avatar_url?: string | null;
        upi_id?: string | null;
      }[]
    | null;
};

type Expense = {
  id: string;
  trip_id: string;
  title: string;
  amount: number | string;
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
  amount: number | string | null;
  paid_by: string | null;
  booking_date: string | null;
  status: string | null;
};

type ItineraryItem = {
  id: string;
  trip_id: string;
  title: string;
  item_date: string | null;
  location: string | null;
  type: string | null;
};

/* ========================================================================== */
/* MAIN PAGE                                                                  */
/* ========================================================================== */

export default function TripOverviewPage() {
  const params = useParams<{ tripId: string }>();
  const router = useRouter();

  const tripId = String(params?.tripId || "");

  const supabase = useMemo(() => getSupabase(), []);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadTrip = useCallback(
    async (refresh = false) => {
      if (!tripId) {
        return;
      }

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const currentUser = await getCurrentUser();

        if (!currentUser) {
          router.push("/login");
          return;
        }

        /* ------------------------------------------------------------------ */
        /* TRIP                                                                */
        /* ------------------------------------------------------------------ */

        const tripResult = await supabase
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
          .eq("id", tripId)
          .maybeSingle();

        if (tripResult.error) {
          throw tripResult.error;
        }

        if (!tripResult.data) {
          setTrip(null);
          setError("Trip not found.");
          return;
        }

        setTrip(tripResult.data as Trip);

        /* ------------------------------------------------------------------ */
        /* MEMBERS                                                             */
        /* ------------------------------------------------------------------ */

        const memberResult = await supabase
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
          .eq("trip_id", tripId);

        if (memberResult.error) {
          throw memberResult.error;
        }

        setMembers(
          (memberResult.data || []) as unknown as Member[]
        );

        /* ------------------------------------------------------------------ */
        /* EXPENSES                                                            */
        /* ------------------------------------------------------------------ */

        const expenseResult = await supabase
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
          });

        if (expenseResult.error) {
          throw expenseResult.error;
        }

        setExpenses(
          (expenseResult.data || []) as Expense[]
        );

        /* ------------------------------------------------------------------ */
        /* BOOKINGS                                                            */
        /* ------------------------------------------------------------------ */

        const bookingResult = await supabase
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
          .eq("trip_id", tripId)
          .order("booking_date", {
            ascending: true,
          });

        if (bookingResult.error) {
          throw bookingResult.error;
        }

        setBookings(
          (bookingResult.data || []) as Booking[]
        );

        /* ------------------------------------------------------------------ */
        /* ITINERARY                                                           */
        /* ------------------------------------------------------------------ */

        const itineraryResult = await supabase
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
          .eq("trip_id", tripId)
          .order("item_date", {
            ascending: true,
          });

        if (itineraryResult.error) {
          throw itineraryResult.error;
        }

        setItinerary(
          (itineraryResult.data || []) as ItineraryItem[]
        );
      } catch (err) {
        console.error("Trip loading error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this trip."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router, supabase, tripId]
  );

  useEffect(() => {
    loadTrip();
  }, [loadTrip]);

  /* ======================================================================== */
  /* CALCULATIONS                                                             */
  /* ======================================================================== */

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

  const upcomingBookings = useMemo(() => {
    return bookings.slice(0, 3);
  }, [bookings]);

  const upcomingItinerary = useMemo(() => {
    return itinerary.slice(0, 4);
  }, [itinerary]);

  /* ======================================================================== */
  /* LOADING                                                                  */
  /* ======================================================================== */

  if (loading) {
    return (
      <TripShell tripId={tripId}>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#191a18] text-[#f4f0e6]">
              <RefreshCw
                size={23}
                className="animate-spin"
              />
            </div>

            <h1 className="mt-6 font-serif text-3xl">
              Loading your trip...
            </h1>

            <p className="mt-2 text-sm text-[#817d74]">
              Reading your itinerary, people and ledger.
            </p>
          </div>
        </div>
      </TripShell>
    );
  }

  /* ======================================================================== */
  /* ERROR / NOT FOUND                                                        */
  /* ======================================================================== */

  if (!trip) {
    return (
      <TripShell tripId={tripId}>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="max-w-md rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8e5d9] text-[#566055]">
              <MapPin size={23} />
            </div>

            <h1 className="mt-5 font-serif text-3xl">
              Trip not found
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#817d74]">
              {error ||
                "This trip could not be loaded."}
            </p>

            <div className="mt-6 flex justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white"
              >
                <ArrowLeft size={15} />
                Dashboard
              </Link>

              <button
                type="button"
                onClick={() => loadTrip()}
                className="inline-flex items-center gap-2 rounded-full border border-[#292a25]/15 bg-white px-5 py-3 text-sm font-bold"
              >
                <RefreshCw size={15} />
                Retry
              </button>
            </div>
          </div>
        </div>
      </TripShell>
    );
  }

  /* ======================================================================== */
  /* PAGE                                                                     */
  /* ======================================================================== */

  return (
    <TripShell tripId={tripId}>
      {/* ================================================================== */}
      {/* ERROR                                                              */}
      {/* ================================================================== */}

      {error && (
        <div className="mb-6 flex flex-col gap-4 rounded-[24px] border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-red-800">
              Something went wrong
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadTrip(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-red-800 px-4 py-2.5 text-sm font-bold text-white"
          >
            <RefreshCw size={15} />
            Retry
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* HERO                                                               */}
      {/* ================================================================== */}

      <section className="relative overflow-hidden rounded-[34px] border border-[#292a25]/10 bg-[#1c2721] p-7 text-white shadow-[0_25px_70px_rgba(30,40,30,.12)] md:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#d5c18e]">
            <span className="h-px w-8 bg-[#d5c18e]" />

            Trip overview

            <span className="text-white/30">
              /
            </span>

            {trip.destination ||
              "Your journey"}
          </div>

          <div className="mt-7 flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <h1 className="font-serif text-[48px] leading-[.95] tracking-[-.045em] sm:text-[62px] md:text-[76px]">
                {trip.name}
              </h1>

              <div className="mt-6 flex flex-wrap gap-3">
                {trip.destination && (
                  <InfoPill
                    icon={<MapPin size={14} />}
                    text={trip.destination}
                  />
                )}

                <InfoPill
                  icon={<CalendarDays size={14} />}
                  text={formatDateRange(
                    trip.start_date,
                    trip.end_date
                  )}
                />

                <InfoPill
                  icon={<Users size={14} />}
                  text={`${members.length} participant${
                    members.length === 1
                      ? ""
                      : "s"
                  }`}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadTrip(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold backdrop-blur transition hover:bg-white/15 disabled:opacity-50 lg:self-auto"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* QUICK STATS                                                        */}
      {/* ================================================================== */}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<CircleDollarSign size={19} />}
          label="Trip spend"
          value={formatMoney(totalTripSpend)}
          detail={`${expenses.length} expenses`}
        />

        <StatCard
          icon={<Receipt size={19} />}
          label="Expenses"
          value={formatMoney(totalExpenses)}
          detail="Shared trip costs"
        />

        <StatCard
          icon={<Hotel size={19} />}
          label="Bookings"
          value={String(bookings.length)}
          detail={formatMoney(totalBookings)}
        />

        <StatCard
          icon={<Users size={19} />}
          label="Travelers"
          value={String(members.length)}
          detail="Trip participants"
        />
      </section>

      {/* ================================================================== */}
      {/* FEATURE NAVIGATION                                                 */}
      {/* ================================================================== */}

      <section className="mt-10">
        <div className="mb-5">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
            Manage this trip
          </p>

          <h2 className="mt-2 font-serif text-3xl md:text-4xl">
            Everything in one place
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#817d74]">
            Each section below belongs to this exact trip.
            Your expenses, bookings, itinerary and settlement
            stay connected to <b>{trip.name}</b>.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* EXPENSES */}

          <FeatureCard
            href={`/trip/${tripId}/expenses`}
            icon={<WalletCards size={21} />}
            eyebrow="Money"
            title="Expenses"
            description="Add, review and split every trip expense."
            stat={`${expenses.length} recorded`}
            accent="green"
          />

          {/* SETTLEMENT */}

          <FeatureCard
            href={`/trip/${tripId}/settlement`}
            icon={<CircleDollarSign size={21} />}
            eyebrow="Balances"
            title="Settlement"
            description="See who owes whom and settle balances."
            stat="Calculate balances"
            accent="gold"
          />

          {/* BOOKINGS */}

          <FeatureCard
            href={`/trip/${tripId}/bookings`}
            icon={<Hotel size={21} />}
            eyebrow="Reservations"
            title="Bookings"
            description="Keep hotels, transport and reservations together."
            stat={`${bookings.length} booking${
              bookings.length === 1
                ? ""
                : "s"
            }`}
            accent="blue"
          />

          {/* ITINERARY */}

          <FeatureCard
            href={`/trip/${tripId}/itinerary`}
            icon={<Route size={21} />}
            eyebrow="Planning"
            title="Itinerary"
            description="Plan activities, locations and trip days."
            stat={`${itinerary.length} item${
              itinerary.length === 1
                ? ""
                : "s"
            }`}
            accent="olive"
          />
        </div>
      </section>

      {/* ================================================================== */}
      {/* TWO COLUMN CONTENT                                                 */}
      {/* ================================================================== */}

      <section className="mt-10 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        {/* ================================================================= */}
        {/* PEOPLE                                                            */}
        {/* ================================================================= */}

        <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.04)] md:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                The group
              </p>

              <h2 className="mt-2 font-serif text-3xl">
                Travelers
              </h2>

              <p className="mt-2 text-sm text-[#817d74]">
                Everyone connected to this trip.
              </p>
            </div>

            <span className="rounded-full bg-[#e8e5d9] px-3 py-1.5 text-xs font-bold text-[#68655d]">
              {members.length}
            </span>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {members.length ? (
              members.map((member) => (
                <MemberCard
                  key={
                    member.id ||
                    member.user_id
                  }
                  member={member}
                />
              ))
            ) : (
              <EmptyBox
                title="No participants yet"
                description="Trip participants will appear here."
              />
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* RECENT EXPENSES                                                   */}
        {/* ================================================================= */}

        <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.04)] md:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                Ledger
              </p>

              <h2 className="mt-2 font-serif text-3xl">
                Recent expenses
              </h2>
            </div>

            <Link
              href={`/trip/${tripId}/expenses`}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#355244] hover:underline"
            >
              View all
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="mt-6">
            {expenses.length ? (
              <div className="space-y-2">
                {expenses
                  .slice(0, 5)
                  .map((expense) => (
                    <ExpenseRow
                      key={expense.id}
                      expense={expense}
                      members={members}
                    />
                  ))}
              </div>
            ) : (
              <EmptyBox
                title="No expenses yet"
                description="Add your first trip expense from the Expenses page."
                href={`/trip/${tripId}/expenses`}
              />
            )}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* ITINERARY + BOOKINGS                                               */}
      {/* ================================================================== */}

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ================================================================= */}
        {/* ITINERARY                                                         */}
        {/* ================================================================= */}

        <div className="rounded-[30px] border border-[#292a25]/10 bg-[#e8e3d5] p-6 md:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                Journey
              </p>

              <h2 className="mt-2 font-serif text-3xl">
                Itinerary
              </h2>
            </div>

            <Link
              href={`/trip/${tripId}/itinerary`}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#355244] hover:underline"
            >
              Open
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="mt-6">
            {upcomingItinerary.length ? (
              <div className="space-y-3">
                {upcomingItinerary.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="flex gap-3 rounded-2xl bg-[#f8f5ec] p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d9dfd5] text-[#355244]">
                        <Route size={17} />
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold">
                          {item.title}
                        </p>

                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#817d74]">
                          {item.item_date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays size={12} />
                              {formatDate(
                                item.item_date
                              )}
                            </span>
                          )}

                          {item.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={12} />
                              {item.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <EmptyBox
                title="No itinerary items"
                description="Start planning your trip days."
                href={`/trip/${tripId}/itinerary`}
              />
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* BOOKINGS                                                          */}
        {/* ================================================================= */}

        <div className="rounded-[30px] border border-[#292a25]/10 bg-[#eef5ff] p-6 md:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#60718e]">
                Reservations
              </p>

              <h2 className="mt-2 font-serif text-3xl">
                Upcoming bookings
              </h2>
            </div>

            <Link
              href={`/trip/${tripId}/bookings`}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#355244] hover:underline"
            >
              Open
              <ChevronRight size={14} />
            </Link>
          </div>

          <div className="mt-6">
            {upcomingBookings.length ? (
              <div className="space-y-3">
                {upcomingBookings.map(
                  (booking) => (
                    <div
                      key={booking.id}
                      className="flex gap-3 rounded-2xl bg-white/80 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#dce8f6] text-[#46627f]">
                        <Hotel size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-bold">
                              {booking.title}
                            </p>

                            {booking.vendor && (
                              <p className="mt-1 text-xs text-[#817d74]">
                                {booking.vendor}
                              </p>
                            )}
                          </div>

                          {booking.amount != null && (
                            <p className="font-serif text-lg font-bold">
                              {formatMoney(
                                Number(
                                  booking.amount
                                )
                              )}
                            </p>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#817d74]">
                          {booking.booking_date && (
                            <span className="flex items-center gap-1">
                              <CalendarDays size={12} />
                              {formatDate(
                                booking.booking_date
                              )}
                            </span>
                          )}

                          {booking.type && (
                            <span className="flex items-center gap-1">
                              <Clock3 size={12} />
                              {booking.type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : (
              <EmptyBox
                title="No bookings yet"
                description="Hotels, transport and reservations will appear here."
                href={`/trip/${tripId}/bookings`}
              />
            )}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SMART MANAGEMENT                                                    */}
      {/* ================================================================== */}

      <section className="mt-6 overflow-hidden rounded-[30px] border border-[#cdd8ec] bg-gradient-to-r from-[#eef5ff] via-white to-[#f5f0df] p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#355244] shadow-sm">
              <Sparkles size={20} />
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#60718e]">
                TripWise
              </p>

              <h2 className="mt-1 font-serif text-2xl">
                One ledger for the whole journey
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68655d]">
                Expenses, participants, bookings,
                itinerary and settlement all stay connected
                to this trip. Changes here remain scoped to{" "}
                <b>{trip.name}</b>.
              </p>
            </div>
          </div>

          <Link
            href={`/trip/${tripId}/settlement`}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5"
          >
            View settlement
            <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ================================================================== */}
      {/* BACK                                                                */}
      {/* ================================================================== */}

      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#355244] hover:underline"
        >
          <ArrowLeft size={15} />
          Back to dashboard
        </Link>
      </div>
    </TripShell>
  );
}

/* ========================================================================== */
/* SHELL                                                                      */
/* ========================================================================== */

function TripShell({
  tripId,
  children,
}: {
  tripId: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f4f0e6] text-[#191917]">
      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            "linear-gradient(rgba(31,39,34,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(31,39,34,.045) 1px, transparent 1px)",
          backgroundSize: "46px 46px",
        }}
      >
        <header className="sticky top-0 z-50 border-b border-[#292a25]/10 bg-[#f4f0e6]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[78px] max-w-[1450px] items-center justify-between px-5 md:px-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#191a18] font-serif text-lg font-bold text-[#f4f0e6]">
                T
              </span>

              <span className="hidden sm:block">
                <b className="font-serif text-xl">
                  TripWise
                </b>

                <small className="block text-[9px] font-bold uppercase tracking-[.2em] text-[#927543]">
                  Group travel
                </small>
              </span>
            </Link>

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-[#292a25]/15 bg-[#f8f5ec] px-4 py-2.5 text-sm font-bold transition hover:bg-white"
            >
              <ArrowLeft size={15} />

              <span className="hidden sm:inline">
                Dashboard
              </span>

              <span className="sm:hidden">
                Back
              </span>
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-[1250px] px-5 py-8 md:px-8 md:py-10">
          {children}
        </section>
      </div>
    </main>
  );
}

/* ========================================================================== */
/* FEATURE CARD                                                               */
/* ========================================================================== */

function FeatureCard({
  href,
  icon,
  eyebrow,
  title,
  description,
  stat,
  accent,
}: {
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  stat: string;
  accent:
    | "green"
    | "gold"
    | "blue"
    | "olive";
}) {
  const accentClasses = {
    green: {
      icon: "bg-[#e1ebe1] text-[#355244]",
      line: "bg-[#8fa691]",
    },
    gold: {
      icon: "bg-[#eee6d2] text-[#6c5d38]",
      line: "bg-[#b8a476]",
    },
    blue: {
      icon: "bg-[#dce8f6] text-[#46627f]",
      line: "bg-[#91a9c4]",
    },
    olive: {
      icon: "bg-[#e6e8d9] text-[#62694a]",
      line: "bg-[#9da77b]",
    },
  }[accent];

  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_10px_35px_rgba(40,40,30,.035)] transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_45px_rgba(40,40,30,.08)]"
    >
      <div
        className={`absolute inset-x-0 top-0 h-1 ${accentClasses.line}`}
      />

      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accentClasses.icon}`}
        >
          {icon}
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#292a25]/10 transition group-hover:translate-x-1 group-hover:bg-[#191a18] group-hover:text-white">
          <ChevronRight size={17} />
        </div>
      </div>

      <p className="mt-6 text-[9px] font-bold uppercase tracking-[.18em] text-[#927543]">
        {eyebrow}
      </p>

      <h3 className="mt-2 font-serif text-2xl">
        {title}
      </h3>

      <p className="mt-2 min-h-[48px] text-sm leading-6 text-[#817d74]">
        {description}
      </p>

      <div className="mt-5 border-t border-[#292a25]/8 pt-4 text-xs font-bold text-[#68655d]">
        {stat}
      </div>
    </Link>
  );
}

/* ========================================================================== */
/* STAT CARD                                                                  */
/* ========================================================================== */

function StatCard({
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
    <div className="rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_10px_35px_rgba(40,40,30,.035)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055]">
          {icon}
        </div>

        <span className="text-[9px] font-bold uppercase tracking-[.15em] text-[#aaa59a]">
          Trip
        </span>
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#8b877d]">
        {label}
      </p>

      <p className="mt-1 font-serif text-2xl">
        {value}
      </p>

      <p className="mt-1 text-xs text-[#8b877d]">
        {detail}
      </p>
    </div>
  );
}

/* ========================================================================== */
/* MEMBER CARD                                                                */
/* ========================================================================== */

function MemberCard({
  member,
}: {
  member: Member;
}) {
  const profile = getMemberProfile(member);

  const safeName =
    profile?.name?.trim() ||
    profile?.email?.trim() ||
    "Traveler";

  const email =
    profile?.email?.trim() || "";

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-white p-4">
      <PersonBubble
        name={safeName}
        member={member}
      />

      <div className="min-w-0">
        <p className="truncate text-sm font-bold">
          {safeName}
        </p>

        <p className="mt-1 truncate text-xs text-[#8b877d]">
          {email || "Trip participant"}
        </p>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* PERSON BUBBLE — SAFE                                                      */
/* ========================================================================== */

function PersonBubble({
  name,
  member,
}: {
  name?: string | null;
  member?: Member | null;
}) {
  const profile = member
    ? getMemberProfile(member)
    : null;

  const safeName =
    profile?.name?.trim() ||
    name?.trim() ||
    profile?.email?.trim() ||
    "Traveler";

  return (
    <div
      title={
        profile?.email ||
        safeName
      }
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#292a25]/10 bg-[#e8e5d9] text-xs font-bold text-[#566055]"
    >
      {safeName.charAt(0).toUpperCase()}
    </div>
  );
}

/* ========================================================================== */
/* EXPENSE ROW                                                                */
/* ========================================================================== */

function ExpenseRow({
  expense,
  members,
}: {
  expense: Expense;
  members: Member[];
}) {
  const payer = expense.paid_by
    ? members.find(
        (member) =>
          member.user_id ===
          expense.paid_by
      )
    : null;

  const payerProfile = payer
    ? getMemberProfile(payer)
    : null;

  const payerName =
    payerProfile?.name?.trim() ||
    payerProfile?.email?.trim() ||
    "Traveler";

  return (
    <Link
      href={`/trip/${expense.trip_id}/expenses`}
      className="group flex items-center justify-between gap-4 rounded-2xl bg-white p-4 transition hover:-translate-y-0.5"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055]">
          <Receipt size={17} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {expense.title}
          </p>

          <p className="mt-1 truncate text-xs text-[#8b877d]">
            {expense.category ||
              "Trip expense"}{" "}
            · paid by {payerName}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <p className="font-serif text-lg font-bold">
          {formatMoney(
            Number(expense.amount || 0)
          )}
        </p>

        <ChevronRight
          size={15}
          className="text-[#aaa59a] transition group-hover:translate-x-1"
        />
      </div>
    </Link>
  );
}

/* ========================================================================== */
/* EMPTY BOX                                                                  */
/* ========================================================================== */

function EmptyBox({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#292a25]/15 bg-white/60 p-6 text-center">
      <p className="font-serif text-xl">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#817d74]">
        {description}
      </p>

      {href && (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#355244] hover:underline"
        >
          Open section
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

/* ========================================================================== */
/* INFO PILL                                                                  */
/* ========================================================================== */

function InfoPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur">
      {icon}
      {text}
    </span>
  );
}

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

function getMemberProfile(
  member: Member
) {
  if (member.profile) {
    return member.profile;
  }

  if (Array.isArray(member.profiles)) {
    return member.profiles[0] || null;
  }

  return member.profiles || null;
}

function formatMoney(
  amount: number
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(Number(amount || 0));
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Date not set";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateRange(
  start: string | null,
  end: string | null
) {
  if (!start && !end) {
    return "Dates not set";
  }

  if (start && !end) {
    return formatDate(start);
  }

  if (!start && end) {
    return formatDate(end);
  }

  return `${formatDate(start)} → ${formatDate(end)}`;
}