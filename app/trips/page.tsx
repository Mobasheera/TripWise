"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import Link from "next/link";
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

type TripMember = {
  id: string;
  trip_id: string;
  user_id: string;
  role: string | null;
};

type TripCardData = Trip & {
  memberCount: number;
};

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

export default function MyTripsPage() {
  const supabase = useMemo(
    () => getSupabase(),
    []
  );

  const [trips, setTrips] = useState<TripCardData[]>(
    []
  );

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  /* ======================================================================== */
  /* LOAD TRIPS                                                               */
  /* ======================================================================== */

  const loadTrips = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const currentUser =
          await getCurrentUser();

        if (!currentUser) {
          window.location.href = "/login";
          return;
        }

        /* ------------------------------------------------------------------ */
        /* OWNED TRIPS                                                        */
        /* ------------------------------------------------------------------ */

        const ownedResult = await supabase
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
          .eq(
            "created_by",
            currentUser.id
          )
          .order("created_at", {
            ascending: false,
          });

        if (ownedResult.error) {
          throw ownedResult.error;
        }

        /* ------------------------------------------------------------------ */
        /* MEMBER TRIPS                                                       */
        /* ------------------------------------------------------------------ */

        const membershipResult =
          await supabase
            .from("trip_members")
            .select(
              `
                id,
                trip_id,
                user_id,
                role
              `
            )
            .eq(
              "user_id",
              currentUser.id
            );

        if (membershipResult.error) {
          throw membershipResult.error;
        }

        const memberships =
          (membershipResult.data ||
            []) as TripMember[];

        const memberTripIds =
          memberships
            .map(
              (member) =>
                member.trip_id
            )
            .filter(Boolean);

        let memberTrips: Trip[] = [];

        if (memberTripIds.length > 0) {
          const memberTripsResult =
            await supabase
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
              .in(
                "id",
                memberTripIds
              )
              .order("created_at", {
                ascending: false,
              });

          if (memberTripsResult.error) {
            throw memberTripsResult.error;
          }

          memberTrips =
            (memberTripsResult.data ||
              []) as Trip[];
        }

        /* ------------------------------------------------------------------ */
        /* MERGE WITHOUT DUPLICATES                                           */
        /* ------------------------------------------------------------------ */

        const allTrips = [
          ...((ownedResult.data ||
            []) as Trip[]),
          ...memberTrips,
        ];

        const uniqueTrips =
          Array.from(
            new Map(
              allTrips.map((trip) => [
                trip.id,
                trip,
              ])
            ).values()
          );

        /* ------------------------------------------------------------------ */
        /* GET MEMBER COUNTS                                                  */
        /* ------------------------------------------------------------------ */

        const tripIds =
          uniqueTrips.map(
            (trip) => trip.id
          );

        let memberCounts: Record<
          string,
          number
        > = {};

        if (tripIds.length > 0) {
          const membersResult =
            await supabase
              .from("trip_members")
              .select(
                `
                  id,
                  trip_id,
                  user_id
                `
              )
              .in(
                "trip_id",
                tripIds
              );

          if (membersResult.error) {
            throw membersResult.error;
          }

          const members =
            (membersResult.data ||
              []) as {
              id: string;
              trip_id: string;
              user_id: string;
            }[];

          for (const member of members) {
            memberCounts[
              member.trip_id
            ] =
              (memberCounts[
                member.trip_id
              ] || 0) + 1;
          }
        }

        /* ------------------------------------------------------------------ */
        /* BUILD CARDS                                                        */
        /* ------------------------------------------------------------------ */

        const cards: TripCardData[] =
          uniqueTrips
            .map((trip) => ({
              ...trip,
              memberCount:
                memberCounts[
                  trip.id
                ] || 0,
            }))
            .sort(
              (a, b) =>
                new Date(
                  b.created_at
                ).getTime() -
                new Date(
                  a.created_at
                ).getTime()
            );

        setTrips(cards);
      } catch (err) {
        console.error(
          "My Trips loading error:",
          err
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your trips."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  /* ======================================================================== */
  /* FILTER                                                                   */
  /* ======================================================================== */

  const filteredTrips = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    if (!query) {
      return trips;
    }

    return trips.filter((trip) => {
      return (
        trip.name
          .toLowerCase()
          .includes(query) ||
        trip.destination
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [search, trips]);

  /* ======================================================================== */
  /* LOADING                                                                  */
  /* ======================================================================== */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e6] text-[#191917]">
        <div className="mx-auto flex min-h-screen max-w-[1250px] items-center justify-center px-5">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#191a18] text-white">
              <RefreshCw
                size={22}
                className="animate-spin"
              />
            </div>

            <h1 className="mt-6 font-serif text-3xl">
              Loading your trips...
            </h1>

            <p className="mt-2 text-sm text-[#817d74]">
              Finding all trips connected to your account.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* ======================================================================== */
  /* PAGE                                                                     */
  /* ======================================================================== */

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
        {/* ================================================================== */}
        {/* HEADER                                                             */}
        {/* ================================================================== */}

        <header className="sticky top-0 z-50 border-b border-[#292a25]/10 bg-[#f4f0e6]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[78px] max-w-[1250px] items-center justify-between px-5 md:px-8">
            <Link
              href="/dashboard"
              className="flex items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#191a18] font-serif text-lg font-bold text-[#f4f0e6]">
                T
              </span>

              <div className="hidden sm:block">
                <p className="font-serif text-xl font-bold">
                  TripWise
                </p>

                <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#927543]">
                  Group travel
                </p>
              </div>
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

        {/* ================================================================== */}
        {/* CONTENT                                                            */}
        {/* ================================================================== */}

        <section className="mx-auto max-w-[1250px] px-5 py-10 md:px-8 md:py-14">
          {/* ================================================================ */}
          {/* HERO                                                             */}
          {/* ================================================================ */}

          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                <span className="h-px w-8 bg-[#927543]" />

                Your journeys
              </div>

              <h1 className="mt-4 font-serif text-[48px] leading-none tracking-[-.04em] md:text-[70px]">
                My Trips
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-[#817d74] md:text-base">
                All the trips connected to your account,
                together in one place. Select a trip to open
                its overview, expenses, settlement, bookings
                and itinerary.
              </p>
            </div>

            <Link
              href="/trip/new"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5"
            >
              <Plus size={17} />
              Create new trip
            </Link>
          </div>

          {/* ================================================================ */}
          {/* SEARCH                                                           */}
          {/* ================================================================ */}

          <div className="mt-9 flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#969188]"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search trips or destinations..."
                className="h-12 w-full rounded-full border border-[#292a25]/12 bg-[#f8f5ec] pl-11 pr-5 text-sm outline-none transition placeholder:text-[#aaa59a] focus:border-[#355244]/40 focus:bg-white"
              />
            </div>

            <button
              type="button"
              onClick={() => loadTrips(true)}
              disabled={refreshing}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#292a25]/12 bg-[#f8f5ec] px-5 text-sm font-bold transition hover:bg-white disabled:opacity-50"
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

          {/* ================================================================ */}
          {/* ERROR                                                            */}
          {/* ================================================================ */}

          {error && (
            <div className="mt-6 rounded-[24px] border border-red-200 bg-red-50 p-5">
              <p className="font-bold text-red-800">
                Unable to load trips
              </p>

              <p className="mt-1 text-sm text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* ================================================================ */}
          {/* TRIP COUNT                                                       */}
          {/* ================================================================ */}

          <div className="mt-10 flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#927543]">
                Your collection
              </p>

              <h2 className="mt-1 font-serif text-3xl">
                {search
                  ? `${filteredTrips.length} matching trip${
                      filteredTrips.length ===
                      1
                        ? ""
                        : "s"
                    }`
                  : `${trips.length} trip${
                      trips.length === 1
                        ? ""
                        : "s"
                    }`}
              </h2>
            </div>
          </div>

          {/* ================================================================ */}
          {/* TRIPS                                                            */}
          {/* ================================================================ */}

          {filteredTrips.length > 0 ? (
            <div className="mt-6 space-y-4">
              {filteredTrips.map(
                (trip, index) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    index={index}
                  />
                )
              )}
            </div>
          ) : (
            <EmptyTrips
              hasSearch={Boolean(
                search.trim()
              )}
            />
          )}

          {/* ================================================================ */}
          {/* CREATE CARD                                                      */}
          {/* ================================================================ */}

          {!search && (
            <Link
              href="/trip/new"
              className="group mt-6 flex min-h-[150px] items-center justify-center rounded-[30px] border border-dashed border-[#292a25]/20 bg-[#f8f5ec]/70 p-8 text-center transition hover:border-[#355244]/40 hover:bg-white"
            >
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#292a25]/15 bg-white text-[#355244] transition group-hover:scale-105">
                  <Plus size={20} />
                </div>

                <p className="mt-4 font-serif text-2xl">
                  Start another journey
                </p>

                <p className="mt-1 text-sm text-[#817d74]">
                  Create a new trip and invite your group.
                </p>
              </div>
            </Link>
          )}
        </section>
      </div>
    </main>
  );
}

/* ========================================================================== */
/* TRIP CARD                                                                  */
/* ========================================================================== */

function TripCard({
  trip,
  index,
}: {
  trip: TripCardData;
  index: number;
}) {
  return (
    <Link
      href={`/trip/${trip.id}`}
      className="group block"
    >
      <article className="relative overflow-hidden rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_10px_35px_rgba(40,40,30,.035)] transition duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_50px_rgba(40,40,30,.08)] md:p-6">
        {/* LEFT ACCENT */}

        <div className="absolute bottom-0 left-0 top-0 w-1 bg-[#355244] opacity-70 transition group-hover:opacity-100" />

        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* ================================================================ */}
          {/* NUMBER                                                           */}
          {/* ================================================================ */}

          <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#e8e5d9] font-serif text-xl text-[#566055] md:flex">
            {String(index + 1).padStart(
              2,
              "0"
            )}
          </div>

          {/* ================================================================ */}
          {/* MAIN                                                             */}
          {/* ================================================================ */}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#e1ebe1] px-3 py-1 text-[9px] font-bold uppercase tracking-[.15em] text-[#355244]">
                Trip
              </span>

              {trip.created_by && (
                <span className="rounded-full bg-[#eee6d2] px-3 py-1 text-[9px] font-bold uppercase tracking-[.15em] text-[#6c5d38]">
                  Active
                </span>
              )}
            </div>

            <h3 className="mt-3 truncate font-serif text-3xl tracking-[-.02em] md:text-4xl">
              {trip.name}
            </h3>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#817d74]">
              {trip.destination && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} />
                  {trip.destination}
                </span>
              )}

              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} />
                {formatDateRange(
                  trip.start_date,
                  trip.end_date
                )}
              </span>

              <span className="flex items-center gap-1.5">
                <Users size={13} />
                {trip.memberCount} traveler
                {trip.memberCount === 1
                  ? ""
                  : "s"}
              </span>
            </div>
          </div>

          {/* ================================================================ */}
          {/* OPEN                                                             */}
          {/* ================================================================ */}

          <div className="flex shrink-0 items-center justify-between gap-4 md:justify-end">
            <div className="hidden text-right md:block">
              <p className="text-[9px] font-bold uppercase tracking-[.15em] text-[#aaa59a]">
                Open trip
              </p>

              <p className="mt-1 text-xs font-semibold text-[#68655d]">
                View overview
              </p>
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#292a25]/12 bg-white transition group-hover:translate-x-1 group-hover:bg-[#191a18] group-hover:text-white">
              <ChevronRight size={19} />
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}

/* ========================================================================== */
/* EMPTY STATE                                                                */
/* ========================================================================== */

function EmptyTrips({
  hasSearch,
}: {
  hasSearch: boolean;
}) {
  return (
    <div className="mt-6 rounded-[30px] border border-dashed border-[#292a25]/15 bg-[#f8f5ec] px-6 py-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8e5d9] text-[#566055]">
        {hasSearch ? (
          <Search size={22} />
        ) : (
          <MapPin size={22} />
        )}
      </div>

      <h3 className="mt-5 font-serif text-3xl">
        {hasSearch
          ? "No matching trips"
          : "No trips yet"}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#817d74]">
        {hasSearch
          ? "Try a different trip name or destination."
          : "Create your first trip to start planning, tracking expenses and settling up with your group."}
      </p>

      {!hasSearch && (
        <Link
          href="/trip/new"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white"
        >
          <Plus size={16} />
          Create trip
        </Link>
      )}
    </div>
  );
}

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

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