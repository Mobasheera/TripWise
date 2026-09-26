"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronDown,
  CreditCard,
  LayoutDashboard,
  List,
  Map,
  PieChart,
  Settings,
  User,
  WalletCards,
} from "lucide-react";
import { getAccessibleTrips } from "@/lib/tripAccess";

type Trip = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
};

type TripSidebarProps = {
  activeTripId?: string;
};

export default function TripSidebar({
  activeTripId,
}: TripSidebarProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [tripsOpen, setTripsOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  async function loadTrips() {
    try {
      const accessibleTrips = await getAccessibleTrips();
      setTrips(accessibleTrips);
    } catch (error) {
      console.error("Could not load trips:", error);
      setTrips([]);
    } finally {
      setLoading(false);
    }
  }

  function tripLabel(trip: Trip) {
    if (trip.destination) {
      return trip.destination;
    }

    return trip.name;
  }

  return (
    <aside className="hidden w-[250px] shrink-0 border-r border-[#292a25]/10 bg-[#f8f5ec] lg:flex lg:flex-col">
      {/* BRAND */}
      <div className="border-b border-[#292a25]/10 px-6 py-6">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#191a18] text-sm font-bold text-white">
            T
          </span>

          <span className="font-serif text-2xl font-bold tracking-[-0.04em]">
            TripWise
          </span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {/* DASHBOARD */}
        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#5e5a52] transition hover:bg-[#ece8dd] hover:text-[#191a18]"
        >
          <LayoutDashboard size={17} />
          Dashboard
        </Link>

        {/* MY TRIPS */}
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setTripsOpen(!tripsOpen)}
            className="flex w-full items-center justify-between px-3 py-2"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#918a7d]">
              My Trips
            </span>

            <ChevronDown
              size={15}
              className={`text-[#918a7d] transition-transform ${
                tripsOpen ? "rotate-0" : "-rotate-90"
              }`}
            />
          </button>

          {tripsOpen && (
            <div className="mt-1 space-y-1">
              {loading ? (
                <div className="px-3 py-3 text-xs text-[#999388]">
                  Loading trips...
                </div>
              ) : trips.length === 0 ? (
                <div className="rounded-xl bg-[#eee9dd] px-3 py-4">
                  <p className="text-xs leading-5 text-[#777269]">
                    No trips yet.
                  </p>

                  <Link
                    href="/trip/new"
                    className="mt-2 inline-block text-xs font-bold text-[#191a18] underline underline-offset-4"
                  >
                    Create your first trip
                  </Link>
                </div>
              ) : (
                trips.map((trip) => {
                  const active =
                    trip.id === activeTripId;

                  return (
                    <Link
                      key={trip.id}
                      href={`/trip/${trip.id}`}
                      className={`group block rounded-xl px-3 py-3 transition ${
                        active
                          ? "bg-[#191a18] text-white"
                          : "text-[#5e5a52] hover:bg-[#ece8dd] hover:text-[#191a18]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            active
                              ? "bg-white/10"
                              : "bg-[#e8e3d7]"
                          }`}
                        >
                          <Map size={15} />
                        </span>

                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold">
                            {trip.name}
                          </span>

                          <span
                            className={`mt-0.5 block truncate text-[11px] ${
                              active
                                ? "text-white/55"
                                : "text-[#918b80]"
                            }`}
                          >
                            {tripLabel(trip)}
                          </span>
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}

              {/* TRIP SUMMARY */}
              <Link
                href="/summary"
                className="mt-2 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#5e5a52] transition hover:bg-[#ece8dd] hover:text-[#191a18]"
              >
                <PieChart size={17} />
                Trip Summary
              </Link>

              {/* CREATE TRIP */}
              <Link
                href="/trip/new"
                className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-[#292a25]/15 px-3 py-3 text-xs font-bold text-[#777269] transition hover:border-[#292a25]/30 hover:bg-white"
              >
                <span className="text-lg leading-none">+</span>
                Create new trip
              </Link>
            </div>
          )}
        </div>

        {/* CURRENT TRIP TOOLS */}
        {activeTripId && (
          <div className="mt-7">
            <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#918a7d]">
              This Trip
            </p>

            <div className="space-y-1">
              <TripNavLink
                href={`/trip/${activeTripId}`}
                icon={<List size={17} />}
                label="Overview"
              />

              <TripNavLink
                href={`/trip/${activeTripId}/expenses`}
                icon={<WalletCards size={17} />}
                label="Expenses"
              />

              <TripNavLink
                href={`/trip/${activeTripId}/bookings`}
                icon={<CreditCard size={17} />}
                label="Bookings"
              />

              <TripNavLink
                href={`/trip/${activeTripId}/itinerary`}
                icon={<CalendarDays size={17} />}
                label="Itinerary"
              />

              <TripNavLink
                href={`/trip/${activeTripId}/settlement`}
                icon={<WalletCards size={17} />}
                label="Settlement"
              />

              <TripNavLink
                href={`/trip/${activeTripId}/summary`}
                icon={<PieChart size={17} />}
                label="Spending Summary"
              />
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM */}
      <div className="border-t border-[#292a25]/10 p-4">
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#5e5a52] transition hover:bg-[#ece8dd] hover:text-[#191a18]"
        >
          <User size={17} />
          Profile
        </Link>

        <button
          type="button"
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#5e5a52] transition hover:bg-[#ece8dd] hover:text-[#191a18]"
        >
          <Settings size={17} />
          Settings
        </button>
      </div>
    </aside>
  );
}

function TripNavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-[#5e5a52] transition hover:bg-[#ece8dd] hover:text-[#191a18]"
    >
      {icon}
      {label}
    </Link>
  );
}