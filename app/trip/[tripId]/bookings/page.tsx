"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  CreditCard,
  Hotel,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plane,
  Plus,
  RefreshCw,
  Search,
  Ship,
  Ticket,
  Trash2,
  TrainFront,
  Users,
  X,
} from "lucide-react";

import { getCurrentUser, getSupabase } from "@/lib/supabase";
import { formatINR } from "@/lib/utils";

/* ====================================================================== */
/* TYPES                                                                  */
/* ====================================================================== */

type Trip = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
};

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url?: string | null;
};

type Member = {
  id: string;
  trip_id: string;
  user_id: string;
  role: string | null;
  profile?: Profile | null;
  profiles?: Profile | Profile[] | null;
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

type BookingForm = {
  title: string;
  type: string;
  vendor: string;
  amount: string;
  paid_by: string;
  booking_date: string;
  status: string;
};

/* ====================================================================== */
/* CONSTANTS                                                              */
/* ====================================================================== */

const BOOKING_TYPES = [
  "Flight",
  "Train",
  "Bus",
  "Hotel",
  "Activity",
  "Car Rental",
  "Ferry",
  "Other",
];

const BOOKING_STATUSES = [
  "confirmed",
  "pending",
  "cancelled",
];

const EMPTY_FORM: BookingForm = {
  title: "",
  type: "Flight",
  vendor: "",
  amount: "",
  paid_by: "",
  booking_date: "",
  status: "confirmed",
};

/* ====================================================================== */
/* HELPERS                                                                */
/* ====================================================================== */

function getProfileFromMember(
  member: Member
): Profile | null {
  if (member.profile) {
    return member.profile;
  }

  if (Array.isArray(member.profiles)) {
    return member.profiles[0] || null;
  }

  return member.profiles || null;
}

function getMemberName(member: Member) {
  const profile = getProfileFromMember(member);

  return (
    profile?.name?.trim() ||
    profile?.email?.trim() ||
    "Traveler"
  );
}

function getMemberEmail(member: Member) {
  const profile = getProfileFromMember(member);

  return profile?.email?.trim() || "";
}

function getBookingTypeIcon(type: string | null) {
  const normalized = type?.toLowerCase() || "";

  if (normalized.includes("flight")) {
    return <Plane size={19} />;
  }

  if (normalized.includes("train")) {
    return <TrainFront size={19} />;
  }

  if (normalized.includes("bus")) {
    return <Ticket size={19} />;
  }

  if (normalized.includes("hotel")) {
    return <Hotel size={19} />;
  }

  if (
    normalized.includes("car") ||
    normalized.includes("rental")
  ) {
    return <Car size={19} />;
  }

  if (normalized.includes("ferry")) {
    return <Ship size={19} />;
  }

  if (normalized.includes("activity")) {
    return <Ticket size={19} />;
  }

  return <CreditCard size={19} />;
}

function formatBookingDate(
  value: string | null
) {
  if (!value) {
    return "Date not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTripDate(
  value: string | null
) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isUpcoming(
  bookingDate: string | null
) {
  if (!bookingDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(bookingDate);
  date.setHours(0, 0, 0, 0);

  return date >= today;
}

function getStatusClasses(
  status: string | null
) {
  switch (status?.toLowerCase()) {
    case "confirmed":
      return "bg-[#dfe9dc] text-[#355244]";

    case "pending":
      return "bg-[#eee4cc] text-[#876c35]";

    case "cancelled":
      return "bg-[#eadbd6] text-[#8a5147]";

    default:
      return "bg-[#e8e5d9] text-[#68655d]";
  }
}

function getStatusLabel(
  status: string | null
) {
  if (!status) return "Unknown";

  return (
    status.charAt(0).toUpperCase() +
    status.slice(1)
  );
}

function getTodayInputValue() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");
  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* ====================================================================== */
/* MAIN PAGE                                                              */
/* ====================================================================== */

export default function BookingsPage() {
  /*
   * IMPORTANT:
   *
   * Next.js 15 client components should use useParams()
   * instead of directly reading params.tripId.
   */
  const params = useParams<{
    tripId: string;
  }>();

  const tripId = params.tripId;

  const supabase = useMemo(
    () => getSupabase(),
    []
  );

  const [trip, setTrip] =
    useState<Trip | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [currentUserId, setCurrentUserId] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [showForm, setShowForm] =
    useState(false);

  const [editingBooking, setEditingBooking] =
    useState<Booking | null>(null);

  const [form, setForm] =
    useState<BookingForm>(EMPTY_FORM);

  /* ------------------------------------------------------------------ */
  /* LOAD PAGE                                                          */
  /* ------------------------------------------------------------------ */

  const loadPage = useCallback(
    async (showRefresh = false) => {
      if (!tripId) {
        return;
      }

      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const user = await getCurrentUser();

        if (!user) {
          throw new Error(
            "Please sign in before viewing bookings."
          );
        }

        setCurrentUserId(user.id);

        /*
         * ------------------------------------------------------------
         * LOAD TRIP
         * ------------------------------------------------------------
         */

        const {
          data: tripData,
          error: tripError,
        } = await supabase
          .from("trips")
          .select(
            `
              id,
              name,
              destination,
              start_date,
              end_date
            `
          )
          .eq("id", tripId)
          .single();

        if (tripError) {
          console.error(
            "Trip query failed:",
            tripError.message,
            tripError.details,
            tripError.hint,
            tripError.code
          );

          throw new Error(
            tripError.message ||
              "Unable to load this trip."
          );
        }

        setTrip(tripData as Trip);

        /*
         * ------------------------------------------------------------
         * LOAD MEMBERS
         * ------------------------------------------------------------
         */

        const {
          data: memberData,
          error: memberError,
        } = await supabase
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
                avatar_url
              )
            `
          )
          .eq("trip_id", tripId);

        if (memberError) {
          console.error(
            "Trip members query failed:",
            memberError.message,
            memberError.details,
            memberError.hint,
            memberError.code
          );

          throw new Error(
            memberError.message ||
              "Unable to load trip members."
          );
        }

        setMembers(
          (memberData || []) as unknown as Member[]
        );

        /*
         * ------------------------------------------------------------
         * LOAD BOOKINGS
         * ------------------------------------------------------------
         */

        const {
          data: bookingData,
          error: bookingError,
        } = await supabase
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
            nullsFirst: false,
          });

        if (bookingError) {
          console.error(
            "Bookings query failed:",
            bookingError.message,
            bookingError.details,
            bookingError.hint,
            bookingError.code
          );

          throw new Error(
            bookingError.message ||
              "Unable to load bookings."
          );
        }

        setBookings(
          (bookingData || []) as Booking[]
        );
      } catch (error) {
        console.error(
          "Failed to load bookings:",
          error instanceof Error
            ? error.message
            : error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load bookings."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase, tripId]
  );

  useEffect(() => {
    if (tripId) {
      loadPage();
    }
  }, [tripId, loadPage]);

  /* ------------------------------------------------------------------ */
  /* MEMBERS                                                            */
  /* ------------------------------------------------------------------ */

  const memberOptions = useMemo(() => {
    const result = [...members];

    const currentUserExists = result.some(
      (member) =>
        member.user_id === currentUserId
    );

    if (
      currentUserId &&
      !currentUserExists
    ) {
      result.unshift({
        id: `current-${currentUserId}`,
        trip_id: tripId,
        user_id: currentUserId,
        role: "member",
        profile: {
          id: currentUserId,
          name: "You",
          email: null,
        },
      });
    }

    return result;
  }, [
    members,
    currentUserId,
    tripId,
  ]);

  /* ------------------------------------------------------------------ */
  /* FILTERED BOOKINGS                                                  */
  /* ------------------------------------------------------------------ */

  const filteredBookings = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesSearch =
        !query ||
        booking.title
          ?.toLowerCase()
          .includes(query) ||
        booking.vendor
          ?.toLowerCase()
          .includes(query) ||
        booking.type
          ?.toLowerCase()
          .includes(query);

      const matchesType =
        typeFilter === "all" ||
        booking.type?.toLowerCase() ===
          typeFilter.toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        booking.status?.toLowerCase() ===
          statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesType &&
        matchesStatus
      );
    });
  }, [
    bookings,
    search,
    typeFilter,
    statusFilter,
  ]);

  /* ------------------------------------------------------------------ */
  /* SUMMARY                                                            */
  /* ------------------------------------------------------------------ */

  const summary = useMemo(() => {
    const activeBookings =
      bookings.filter(
        (booking) =>
          booking.status !== "cancelled"
      );

    const totalAmount =
      activeBookings.reduce(
        (sum, booking) =>
          sum +
          Number(booking.amount || 0),
        0
      );

    const confirmed =
      bookings.filter(
        (booking) =>
          booking.status === "confirmed"
      ).length;

    const pending =
      bookings.filter(
        (booking) =>
          booking.status === "pending"
      ).length;

    const cancelled =
      bookings.filter(
        (booking) =>
          booking.status === "cancelled"
      ).length;

    const upcoming =
      bookings.filter(
        (booking) =>
          booking.status !== "cancelled" &&
          isUpcoming(
            booking.booking_date
          )
      ).length;

    return {
      totalAmount,
      confirmed,
      pending,
      cancelled,
      upcoming,
    };
  }, [bookings]);

  /* ------------------------------------------------------------------ */
  /* FORM                                                               */
  /* ------------------------------------------------------------------ */

  function openCreateForm() {
    setEditingBooking(null);

    setForm({
      ...EMPTY_FORM,
      paid_by:
        currentUserId ||
        memberOptions[0]?.user_id ||
        "",
      booking_date:
        trip?.start_date ||
        getTodayInputValue(),
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function openEditForm(
    booking: Booking
  ) {
    setEditingBooking(booking);

    setForm({
      title: booking.title || "",
      type:
        booking.type || "Flight",
      vendor:
        booking.vendor || "",
      amount:
        booking.amount !== null &&
        booking.amount !== undefined
          ? String(booking.amount)
          : "",
      paid_by:
        booking.paid_by ||
        currentUserId ||
        "",
      booking_date:
        booking.booking_date || "",
      status:
        booking.status ||
        "confirmed",
    });

    setError("");
    setSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    if (saving) return;

    setShowForm(false);
    setEditingBooking(null);
    setForm(EMPTY_FORM);
  }

  function updateForm(
    field: keyof BookingForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  /* ------------------------------------------------------------------ */
  /* SAVE BOOKING                                                       */
  /* ------------------------------------------------------------------ */

  async function saveBooking(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const title =
      form.title.trim();

    const vendor =
      form.vendor.trim();

    const amount =
      Number(form.amount);

    if (!title) {
      setError(
        "Please enter a booking title."
      );
      return;
    }

    if (!form.type) {
      setError(
        "Please select a booking type."
      );
      return;
    }

    if (
      !form.amount ||
      Number.isNaN(amount) ||
      amount < 0
    ) {
      setError(
        "Please enter a valid booking amount."
      );
      return;
    }

    if (!form.paid_by) {
      setError(
        "Please select who paid for this booking."
      );
      return;
    }

    if (!form.booking_date) {
      setError(
        "Please select a booking date."
      );
      return;
    }

    try {
      setSaving(true);

      /*
       * Make sure the current session still exists.
       */

      const user =
        await getCurrentUser();

      if (!user) {
        throw new Error(
          "Please sign in before saving a booking."
        );
      }

      const payload = {
        trip_id: tripId,
        title,
        type: form.type,
        vendor: vendor || null,
        amount,
        paid_by: form.paid_by,
        booking_date:
          form.booking_date,
        status:
          form.status || "confirmed",
      };

      if (editingBooking) {
        const {
          error: updateError,
        } = await supabase
          .from("bookings")
          .update(payload)
          .eq(
            "id",
            editingBooking.id
          )
          .eq(
            "trip_id",
            tripId
          );

        if (updateError) {
          console.error(
            "Booking update failed:",
            updateError.message,
            updateError.details,
            updateError.hint,
            updateError.code
          );

          throw new Error(
            updateError.message ||
              "Unable to update booking."
          );
        }

        setSuccess(
          "Booking updated successfully."
        );
      } else {
        const {
          data: insertedBooking,
          error: insertError,
        } = await supabase
          .from("bookings")
          .insert(payload)
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
          .single();

        if (insertError) {
          console.error(
            "Booking insert failed:",
            insertError.message,
            insertError.details,
            insertError.hint,
            insertError.code
          );

          throw new Error(
            insertError.message ||
              "Unable to create booking."
          );
        }

        if (insertedBooking) {
          setBookings(
            (previous) => [
              ...previous,
              insertedBooking as Booking,
            ]
          );
        }

        setSuccess(
          "Booking added successfully."
        );
      }

      if (editingBooking) {
        await loadPage(true);
      }

      setShowForm(false);
      setEditingBooking(null);
      setForm(EMPTY_FORM);
    } catch (error) {
      console.error(
        "Saving booking failed:",
        error instanceof Error
          ? error.message
          : error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to save booking."
      );
    } finally {
      setSaving(false);
    }
  }

  /* ------------------------------------------------------------------ */
  /* DELETE BOOKING                                                     */
  /* ------------------------------------------------------------------ */

  async function deleteBooking(
    booking: Booking
  ) {
    const confirmed =
      window.confirm(
        `Delete "${booking.title}"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(booking.id);
      setError("");
      setSuccess("");

      const {
        error: deleteError,
      } = await supabase
        .from("bookings")
        .delete()
        .eq(
          "id",
          booking.id
        )
        .eq(
          "trip_id",
          tripId
        );

      if (deleteError) {
        console.error(
          "Booking delete failed:",
          deleteError.message,
          deleteError.details,
          deleteError.hint,
          deleteError.code
        );

        throw new Error(
          deleteError.message ||
            "Unable to delete booking."
        );
      }

      setBookings(
        (previous) =>
          previous.filter(
            (item) =>
              item.id !== booking.id
          )
      );

      setSuccess(
        "Booking deleted."
      );
    } catch (error) {
      console.error(
        "Deleting booking failed:",
        error instanceof Error
          ? error.message
          : error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete booking."
      );
    } finally {
      setDeletingId("");
    }
  }

  /* ------------------------------------------------------------------ */
  /* LOADING                                                            */
  /* ------------------------------------------------------------------ */

  if (loading) {
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
          <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8">
            <div className="h-5 w-28 animate-pulse rounded bg-[#e3ded1]" />

            <div className="mt-8 h-12 w-72 animate-pulse rounded-xl bg-[#e3ded1]" />

            <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded bg-[#e3ded1]" />

            <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[1, 2, 3, 4].map(
                (item) => (
                  <div
                    key={item}
                    className="h-32 animate-pulse rounded-[25px] bg-[#e8e3d6]"
                  />
                )
              )}
            </div>

            <div className="mt-8 h-80 animate-pulse rounded-[30px] bg-[#e8e3d6]" />
          </div>
        </div>
      </main>
    );
  }

  /* ------------------------------------------------------------------ */
  /* PAGE                                                                */
  /* ------------------------------------------------------------------ */

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
        {/* ============================================================ */}
        {/* TOP BAR                                                       */}
        {/* ============================================================ */}

        <header className="border-b border-[#292a25]/10 bg-[#f8f5ec]/90 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-4 md:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href={`/trip/${tripId}`}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#292a25]/10 bg-[#f4f0e6] transition hover:bg-white"
                title="Back to trip"
              >
                <ArrowLeft size={17} />
              </Link>

              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#8b877c]">
                  TripWise
                </p>

                <p className="truncate text-sm font-bold">
                  {trip?.name ||
                    "Trip bookings"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  loadPage(true)
                }
                disabled={refreshing}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#292a25]/10 bg-[#f4f0e6] transition hover:bg-white disabled:opacity-50"
                title="Refresh bookings"
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

              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex items-center gap-2 rounded-xl bg-[#191a18] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#2b302c]"
              >
                <Plus size={15} />

                <span className="hidden sm:inline">
                  Add booking
                </span>

                <span className="sm:hidden">
                  Add
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* ============================================================ */}
        {/* CONTENT                                                        */}
        {/* ============================================================ */}

        <div className="mx-auto max-w-[1400px] px-5 py-8 md:px-8 md:py-10">
          {/* BACK LINK */}

          <Link
            href={`/trip/${tripId}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#355244] hover:underline"
          >
            <ArrowLeft size={15} />

            Back to trip
          </Link>

          {/* HERO */}

          <section className="mt-7 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#e8e5d9] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-[#566055]">
                  Bookings
                </span>

                {trip?.destination && (
                  <span className="flex items-center gap-1.5 text-xs text-[#817d74]">
                    <Users size={13} />

                    {trip.destination}
                  </span>
                )}
              </div>

              <h1 className="mt-4 font-serif text-5xl leading-[.95] tracking-[-.04em] md:text-6xl">
                Trip bookings
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#68655d]">
                Keep flights, hotels, transport and
                activities for this trip in one place.
                Record who paid so your settlement stays
                accurate.
              </p>

              {trip?.start_date && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#817d74]">
                  <CalendarDays size={14} />

                  <span>
                    {formatTripDate(
                      trip.start_date
                    )}

                    {trip.end_date
                      ? ` — ${formatTripDate(
                          trip.end_date
                        )}`
                      : ""}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={openCreateForm}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#2b302c]"
            >
              <Plus size={16} />

              Add booking
            </button>
          </section>

          {/* ========================================================== */}
          {/* ALERTS                                                       */}
          {/* ========================================================== */}

          {error && (
            <div className="mt-7 flex items-start gap-3 rounded-[22px] border border-red-200 bg-red-50 p-4 text-red-800">
              <CircleAlert
                size={19}
                className="mt-0.5 shrink-0"
              />

              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  Something went wrong
                </p>

                <p className="mt-1 break-words text-sm leading-6">
                  {error}
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setError("")
                }
                className="shrink-0 rounded-lg p-1 hover:bg-red-100"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {success && (
            <div className="mt-7 flex items-center gap-3 rounded-[22px] border border-[#cbdcc6] bg-[#edf4e9] p-4 text-[#355244]">
              <CheckCircle2
                size={19}
                className="shrink-0"
              />

              <p className="text-sm font-bold">
                {success}
              </p>

              <button
                type="button"
                onClick={() =>
                  setSuccess("")
                }
                className="ml-auto rounded-lg p-1 hover:bg-[#dfe9dc]"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* ========================================================== */}
          {/* SUMMARY CARDS                                                */}
          {/* ========================================================== */}

          <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={
                <CreditCard size={18} />
              }
              label="Booking spend"
              value={formatINR(
                summary.totalAmount
              )}
              sub="Confirmed + pending"
            />

            <SummaryCard
              icon={
                <CheckCircle2 size={18} />
              }
              label="Confirmed"
              value={String(
                summary.confirmed
              )}
              sub="Ready bookings"
            />

            <SummaryCard
              icon={
                <Clock3 size={18} />
              }
              label="Pending"
              value={String(
                summary.pending
              )}
              sub="Need confirmation"
            />

            <SummaryCard
              icon={
                <CalendarDays size={18} />
              }
              label="Upcoming"
              value={String(
                summary.upcoming
              )}
              sub="Future bookings"
            />
          </section>

          {/* ========================================================== */}
          {/* SHORTCUTS                                                    */}
          {/* ========================================================== */}

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <FeatureLink
              href={`/trip/${tripId}/expenses`}
              icon={
                <CreditCard size={18} />
              }
              title="Trip expenses"
              description="Record shared costs and split them between travelers."
            />

            <FeatureLink
              href={`/trip/${tripId}/itinerary`}
              icon={
                <CalendarDays size={18} />
              }
              title="Itinerary"
              description="Turn your bookings into a clear day-by-day trip plan."
            />

            <FeatureLink
              href={`/trip/${tripId}/settlement`}
              icon={
                <Users size={18} />
              }
              title="Settlement"
              description="See who owes whom after all trip expenses are calculated."
            />
          </section>

          {/* ========================================================== */}
          {/* FILTERS                                                      */}
          {/* ========================================================== */}

          <section className="mt-8 rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-4 md:p-5">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8d897f]"
                />

                <input
                  type="text"
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search bookings, vendors or types..."
                  className="h-11 w-full rounded-xl border border-[#292a25]/10 bg-[#f4f0e6] pl-11 pr-4 text-sm outline-none transition placeholder:text-[#aaa59a] focus:border-[#566055]/40 focus:bg-white"
                />
              </div>

              <SelectFilter
                value={typeFilter}
                onChange={setTypeFilter}
                options={[
                  {
                    value: "all",
                    label: "All types",
                  },
                  ...BOOKING_TYPES.map(
                    (type) => ({
                      value:
                        type.toLowerCase(),
                      label: type,
                    })
                  ),
                ]}
              />

              <SelectFilter
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  {
                    value: "all",
                    label: "All statuses",
                  },
                  ...BOOKING_STATUSES.map(
                    (status) => ({
                      value: status,
                      label:
                        getStatusLabel(
                          status
                        ),
                    })
                  ),
                ]}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#817d74]">
              <span>
                Showing{" "}
                <b className="text-[#191917]">
                  {
                    filteredBookings.length
                  }
                </b>{" "}
                of{" "}
                <b className="text-[#191917]">
                  {bookings.length}
                </b>{" "}
                bookings
              </span>

              {(search ||
                typeFilter !==
                  "all" ||
                statusFilter !==
                  "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setTypeFilter("all");
                    setStatusFilter("all");
                  }}
                  className="font-bold text-[#355244] hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          </section>

          {/* ========================================================== */}
          {/* BOOKINGS                                                      */}
          {/* ========================================================== */}

          <section className="mt-6">
            {filteredBookings.length ===
            0 ? (
              <EmptyBookings
                hasFilters={
                  Boolean(search) ||
                  typeFilter !==
                    "all" ||
                  statusFilter !==
                    "all"
                }
                onAdd={openCreateForm}
                onClear={() => {
                  setSearch("");
                  setTypeFilter("all");
                  setStatusFilter("all");
                }}
              />
            ) : (
              <div className="space-y-3">
                {filteredBookings.map(
                  (booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      members={members}
                      deleting={
                        deletingId ===
                        booking.id
                      }
                      onEdit={() =>
                        openEditForm(
                          booking
                        )
                      }
                      onDelete={() =>
                        deleteBooking(
                          booking
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
          </section>

          {/* ========================================================== */}
          {/* BOOKING CHECKLIST                                            */}
          {/* ========================================================== */}

          <section className="mt-10 rounded-[30px] border border-[#292a25]/10 bg-[#e8e3d5] p-6 md:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f8f5ec] text-[#355244]">
                <Check size={19} />
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
                  Booking checklist
                </p>

                <h2 className="mt-2 font-serif text-2xl">
                  Keep the trip organized
                </h2>

                <div className="mt-4 grid gap-3 text-sm leading-6 text-[#68655d] md:grid-cols-2">
                  <ChecklistItem>
                    Add flights, trains or buses with
                    their booking date.
                  </ChecklistItem>

                  <ChecklistItem>
                    Add hotels and accommodation so the
                    whole group can find them quickly.
                  </ChecklistItem>

                  <ChecklistItem>
                    Record who actually paid for each
                    booking.
                  </ChecklistItem>

                  <ChecklistItem>
                    Mark uncertain reservations as
                    pending until they are confirmed.
                  </ChecklistItem>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* ============================================================ */}
      {/* CREATE / EDIT MODAL                                           */}
      {/* ============================================================ */}

      {showForm && (
        <BookingModal
          editing={Boolean(editingBooking)}
          form={form}
          members={memberOptions}
          saving={saving}
          onClose={closeForm}
          onSubmit={saveBooking}
          onChange={updateForm}
        />
      )}
    </main>
  );
}

/* ====================================================================== */
/* SUMMARY CARD                                                           */
/* ====================================================================== */

function SummaryCard({
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
    <div className="rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 transition hover:-translate-y-0.5 hover:bg-white">
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

/* ====================================================================== */
/* FEATURE LINK                                                           */
/* ====================================================================== */

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
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#355244]">
        {icon}
      </div>

      <h3 className="mt-5 font-bold">
        {title}
      </h3>

      <p className="mt-2 text-xs leading-5 text-[#817d74]">
        {description}
      </p>
    </Link>
  );
}

/* ====================================================================== */
/* SELECT FILTER                                                          */
/* ====================================================================== */

function SelectFilter({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 min-w-[150px] appearance-none rounded-xl border border-[#292a25]/10 bg-[#f4f0e6] pl-4 pr-10 text-sm font-medium outline-none transition focus:border-[#566055]/40 focus:bg-white"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#77736a]"
      />
    </div>
  );
}

/* ====================================================================== */
/* BOOKING ROW                                                            */
/* ====================================================================== */

function BookingRow({
  booking,
  members,
  deleting,
  onEdit,
  onDelete,
}: {
  booking: Booking;
  members: Member[];
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const payer =
    members.find(
      (member) =>
        member.user_id ===
        booking.paid_by
    ) || null;

  const payerName = payer
    ? getMemberName(payer)
    : booking.paid_by
      ? "Trip member"
      : "Not assigned";

  const upcoming =
    booking.status !== "cancelled" &&
    isUpcoming(
      booking.booking_date
    );

  return (
    <article className="group rounded-[27px] border border-[#292a25]/10 bg-[#f8f5ec] p-4 transition hover:-translate-y-0.5 hover:bg-white md:p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
        {/* ICON */}

        <div className="flex items-start gap-4 lg:w-[38%]">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#566055]">
            {getBookingTypeIcon(
              booking.type
            )}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate font-bold">
                {booking.title}
              </h3>

              {upcoming && (
                <span className="rounded-full bg-[#e0e8db] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.12em] text-[#355244]">
                  Upcoming
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#817d74]">
              {booking.type && (
                <span>
                  {booking.type}
                </span>
              )}

              {booking.vendor && (
                <span>
                  {booking.vendor}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* DATE */}

        <div className="flex items-center gap-3 lg:w-[17%]">
          <CalendarDays
            size={16}
            className="shrink-0 text-[#817d74]"
          />

          <div>
            <p className="text-[10px] uppercase tracking-[.12em] text-[#9a958a]">
              Date
            </p>

            <p className="mt-1 text-sm font-semibold">
              {formatBookingDate(
                booking.booking_date
              )}
            </p>
          </div>
        </div>

        {/* PAID BY */}

        <div className="flex items-center gap-3 lg:w-[19%]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e6e2d6] text-xs font-bold text-[#566055]">
            {payerName
              .charAt(0)
              .toUpperCase()}
          </div>

          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[.12em] text-[#9a958a]">
              Paid by
            </p>

            <p className="mt-1 truncate text-sm font-semibold">
              {payerName}
            </p>

            {payer &&
              getMemberEmail(
                payer
              ) && (
                <p className="truncate text-[10px] text-[#9a958a]">
                  {getMemberEmail(
                    payer
                  )}
                </p>
              )}
          </div>
        </div>

        {/* AMOUNT + STATUS */}

        <div className="flex items-center justify-between gap-4 lg:ml-auto lg:w-[26%]">
          <div>
            <p className="font-serif text-xl font-bold">
              {formatINR(
                Number(
                  booking.amount || 0
                )
              )}
            </p>

            <span
              className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusClasses(
                booking.status
              )}`}
            >
              {getStatusLabel(
                booking.status
              )}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#68655d] transition hover:bg-[#e8e5d9] hover:text-[#191917]"
              title="Edit booking"
            >
              <Pencil size={15} />
            </button>

            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#8a625b] transition hover:bg-[#eadbd6] disabled:opacity-50"
              title="Delete booking"
            >
              {deleting ? (
                <Loader2
                  size={15}
                  className="animate-spin"
                />
              ) : (
                <Trash2 size={15} />
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ====================================================================== */
/* EMPTY BOOKINGS                                                         */
/* ====================================================================== */

function EmptyBookings({
  hasFilters,
  onAdd,
  onClear,
}: {
  hasFilters: boolean;
  onAdd: () => void;
  onClear: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-[30px] border border-dashed border-[#292a25]/15 bg-[#f8f5ec] p-10 text-center md:p-14">
      <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-[#d8d0bd]/40 blur-3xl" />

      <div className="relative">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#566055]">
          <Ticket size={26} />
        </div>

        <h2 className="mt-5 font-serif text-2xl">
          {hasFilters
            ? "No matching bookings"
            : "No bookings yet"}
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#817d74]">
          {hasFilters
            ? "Try changing your search or filters to find a booking."
            : "Add your first flight, hotel, transport or activity and keep the whole trip organized."}
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {hasFilters && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-xl border border-[#292a25]/15 bg-white px-4 py-2.5 text-xs font-bold transition hover:bg-[#f4f0e6]"
            >
              Clear filters
            </button>
          )}

          <button
            type="button"
            onClick={onAdd}
            className="inline-flex items-center gap-2 rounded-xl bg-[#191a18] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#2b302c]"
          >
            <Plus size={15} />

            Add booking
          </button>
        </div>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* BOOKING MODAL                                                          */
/* ====================================================================== */

function BookingModal({
  editing,
  form,
  members,
  saving,
  onClose,
  onSubmit,
  onChange,
}: {
  editing: boolean;
  form: BookingForm;
  members: Member[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (
    event: React.FormEvent
  ) => void;
  onChange: (
    field: keyof BookingForm,
    value: string
  ) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#191917]/35 p-0 backdrop-blur-sm md:items-center md:p-6">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-[30px] bg-[#f8f5ec] shadow-2xl md:max-w-2xl md:rounded-[30px]">
        {/* HEADER */}

        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#292a25]/10 bg-[#f8f5ec]/95 px-5 py-4 backdrop-blur md:px-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#927543]">
              {editing
                ? "Edit booking"
                : "New booking"}
            </p>

            <h2 className="mt-1 font-serif text-2xl">
              {editing
                ? "Update booking"
                : "Add a booking"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#292a25]/10 bg-[#f4f0e6] transition hover:bg-white disabled:opacity-50"
          >
            <X size={17} />
          </button>
        </div>

        {/* FORM */}

        <form
          onSubmit={onSubmit}
          className="space-y-5 p-5 md:p-7"
        >
          <div className="rounded-2xl bg-[#e8e3d5] p-4 text-sm leading-6 text-[#68655d]">
            Add enough information for the group to
            understand what was booked, when it happens,
            and who paid for it.
          </div>

          {/* TITLE */}

          <Field
            label="Booking title"
            required
          >
            <input
              type="text"
              value={form.title}
              onChange={(event) =>
                onChange(
                  "title",
                  event.target.value
                )
              }
              placeholder="e.g. Mumbai → Goa flight"
              className={inputClass}
              autoFocus
            />
          </Field>

          {/* TYPE + VENDOR */}

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Type"
              required
            >
              <div className="relative">
                <select
                  value={form.type}
                  onChange={(event) =>
                    onChange(
                      "type",
                      event.target.value
                    )
                  }
                  className={`${inputClass} appearance-none pr-10`}
                >
                  {BOOKING_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#77736a]"
                />
              </div>
            </Field>

            <Field label="Vendor">
              <input
                type="text"
                value={form.vendor}
                onChange={(event) =>
                  onChange(
                    "vendor",
                    event.target.value
                  )
                }
                placeholder="e.g. IndiGo, Booking.com"
                className={inputClass}
              />
            </Field>
          </div>

          {/* AMOUNT + DATE */}

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label="Amount"
              required
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#77736a]">
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) =>
                    onChange(
                      "amount",
                      event.target.value
                    )
                  }
                  placeholder="0"
                  className={`${inputClass} pl-9`}
                />
              </div>
            </Field>

            <Field
              label="Booking date"
              required
            >
              <input
                type="date"
                value={form.booking_date}
                onChange={(event) =>
                  onChange(
                    "booking_date",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>
          </div>

          {/* PAID BY */}

          <Field
            label="Paid by"
            required
          >
            <div className="relative">
              <select
                value={form.paid_by}
                onChange={(event) =>
                  onChange(
                    "paid_by",
                    event.target.value
                  )
                }
                className={`${inputClass} appearance-none pr-10`}
              >
                <option value="">
                  Select a trip member
                </option>

                {members.map(
                  (member) => (
                    <option
                      key={`${member.user_id}-${member.id}`}
                      value={
                        member.user_id
                      }
                    >
                      {getMemberName(
                        member
                      )}
                      {getMemberEmail(
                        member
                      )
                        ? ` — ${getMemberEmail(
                            member
                          )}`
                        : ""}
                    </option>
                  )
                )}
              </select>

              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#77736a]"
              />
            </div>
          </Field>

          {/* STATUS */}

          <Field
            label="Status"
            required
          >
            <div className="grid grid-cols-3 gap-2">
              {BOOKING_STATUSES.map(
                (status) => {
                  const active =
                    form.status ===
                    status;

                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        onChange(
                          "status",
                          status
                        )
                      }
                      className={`rounded-xl border px-3 py-3 text-xs font-bold transition ${
                        active
                          ? "border-[#355244] bg-[#355244] text-white"
                          : "border-[#292a25]/10 bg-[#f4f0e6] text-[#68655d] hover:bg-white"
                      }`}
                    >
                      {getStatusLabel(
                        status
                      )}
                    </button>
                  );
                }
              )}
            </div>
          </Field>

          {/* ACTIONS */}

          <div className="flex flex-col-reverse gap-3 border-t border-[#292a25]/10 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-[#292a25]/15 bg-white px-5 py-3 text-sm font-bold transition hover:bg-[#f4f0e6] disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#191a18] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#2b302c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />

                  {editing
                    ? "Save changes"
                    : "Add booking"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ====================================================================== */
/* FIELD                                                                  */
/* ====================================================================== */

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold text-[#68655d]">
        {label}

        {required && (
          <span className="ml-1 text-[#8a5147]">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}

/* ====================================================================== */
/* CHECKLIST ITEM                                                         */
/* ====================================================================== */

function ChecklistItem({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f8f5ec] text-[#355244]">
        <Check size={12} />
      </div>

      <p>{children}</p>
    </div>
  );
}

/* ====================================================================== */
/* INPUT STYLE                                                            */
/* ====================================================================== */

const inputClass =
  "h-11 w-full rounded-xl border border-[#292a25]/10 bg-[#f4f0e6] px-4 text-sm outline-none transition placeholder:text-[#aaa59a] focus:border-[#566055]/40 focus:bg-white";