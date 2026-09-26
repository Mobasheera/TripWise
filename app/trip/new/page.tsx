"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import { getSupabase } from "@/lib/supabase";

type MemberDraft = {
  id: string;
  name: string;
  email: string;
};

function createMemberDraft(): MemberDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    email: "",
  };
}

export default function NewTripPage() {
  const router = useRouter();

  const supabase = useMemo(() => getSupabase(), []);

  const [tripName, setTripName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [members, setMembers] = useState<MemberDraft[]>([
    createMemberDraft(),
  ]);

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      setLoadingUser(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        setError("Please sign in before creating a trip.");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, email")
        .eq("id", user.id)
        .maybeSingle();

      setUserName(
        profile?.name ||
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          ""
      );

      setUserEmail(profile?.email || user.email || "");
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to load your account. Please refresh and try again."
      );
    } finally {
      setLoadingUser(false);
    }
  }

  function addMember() {
    setMembers((current) => [...current, createMemberDraft()]);
  }

  function removeMember(id: string) {
    setMembers((current) => current.filter((member) => member.id !== id));
  }

  function updateMember(
    id: string,
    field: keyof MemberDraft,
    value: string
  ) {
    setMembers((current) =>
      current.map((member) =>
        member.id === id
          ? {
              ...member,
              [field]: value,
            }
          : member
      )
    );
  }

  function validateForm() {
    setError("");

    if (!tripName.trim()) {
      setError("Please enter a trip name.");
      return false;
    }

    if (!destination.trim()) {
      setError("Please enter a destination.");
      return false;
    }

    if (!startDate) {
      setError("Please select a start date.");
      return false;
    }

    if (!endDate) {
      setError("Please select an end date.");
      return false;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setError("End date cannot be before the start date.");
      return false;
    }

    const cleanedMembers = members.filter(
      (member) =>
        member.name.trim() ||
        member.email.trim()
    );

    for (const member of cleanedMembers) {
      if (!member.name.trim()) {
        setError("Please enter a name for every added member.");
        return false;
      }

      if (!member.email.trim()) {
        setError(
          `Please enter an email for ${member.name.trim()}.`
        );
        return false;
      }

      if (!member.email.includes("@")) {
        setError(
          `Please enter a valid email for ${member.name.trim()}.`
        );
        return false;
      }
    }

    return true;
  }

  async function ensureProfile(
    id: string,
    name: string,
    email: string
  ) {
    const { data: existingProfile, error: lookupError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("id", id)
        .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existingProfile) {
      return id;
    }

    const { error: insertError } = await supabase
      .from("profiles")
      .insert({
        id,
        name: name || null,
        email: email || null,
      });

    if (insertError) {
      throw insertError;
    }

    return id;
  }

  async function findOrCreateMemberProfile(member: MemberDraft) {
    const email = member.email.trim().toLowerCase();
    const name = member.name.trim();

    const { data: existingProfile, error: lookupError } =
      await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .maybeSingle();

    if (lookupError) {
      throw lookupError;
    }

    if (existingProfile) {
      return existingProfile.id;
    }

    /*
     * This creates a profile record for the trip participant.
     * It does not create a Supabase Auth account.
     *
     * When authentication/invitations are added later,
     * this can be replaced with an invite workflow.
     */
    const newProfileId = crypto.randomUUID();

    const { error: createError } = await supabase
      .from("profiles")
      .insert({
        id: newProfileId,
        name,
        email,
      });

    if (createError) {
      throw createError;
    }

    return newProfileId;
  }

  async function handleCreateTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const currentName =
        userName ||
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        "Trip Organizer";

      const currentEmail =
        userEmail ||
        user.email ||
        "";

      /*
       * Make sure the organizer exists in profiles.
       */
      await ensureProfile(
        user.id,
        currentName,
        currentEmail
      );

      /*
       * Create the trip.
       */
      const { data: trip, error: tripError } =
        await supabase
          .from("trips")
          .insert({
            name: tripName.trim(),
            destination: destination.trim(),
            start_date: startDate,
            end_date: endDate,
            created_by: user.id,
          })
          .select()
          .single();

      if (tripError) {
        throw tripError;
      }

      if (!trip) {
        throw new Error("Trip could not be created.");
      }

      /*
       * Organizer is automatically the first member.
       */
      const memberRows: {
        trip_id: string;
        user_id: string;
        role: string;
      }[] = [
        {
          trip_id: trip.id,
          user_id: user.id,
          role: "organizer",
        },
      ];

      /*
       * Create/find participant profiles.
       */
      const cleanedMembers = members.filter(
        (member) =>
          member.name.trim() ||
          member.email.trim()
      );

      for (const member of cleanedMembers) {
        const profileId =
          await findOrCreateMemberProfile(member);

        /*
         * Don't add organizer twice if they entered
         * their own email.
         */
        if (
          profileId === user.id ||
          member.email.trim().toLowerCase() ===
            currentEmail.toLowerCase()
        ) {
          continue;
        }

        memberRows.push({
          trip_id: trip.id,
          user_id: profileId,
          role: "member",
        });
      }

      /*
       * Remove duplicate profiles.
       */
      const uniqueMembers = Array.from(
        new Map(
          memberRows.map((member) => [
            `${member.trip_id}-${member.user_id}`,
            member,
          ])
        ).values()
      );

      /*
       * Add everyone to trip_members.
       */
      const { error: membersError } =
        await supabase
          .from("trip_members")
          .insert(uniqueMembers);

      if (membersError) {
        /*
         * Try to remove the trip if member insertion fails.
         */
        await supabase
          .from("trips")
          .delete()
          .eq("id", trip.id);

        throw membersError;
      }

      setSuccess("Your trip has been created successfully!");

      /*
       * Small success delay so the user sees the animation.
       */
      setTimeout(() => {
        router.push(`/trip/${trip.id}`);
        router.refresh();
      }, 650);
    } catch (err: any) {
      console.error("Create trip error:", err);

      setError(
        err?.message ||
          "Something went wrong while creating your trip."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#f5f1e7] text-[#171816]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(65,60,48,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(65,60,48,0.055) 1px, transparent 1px)",
        backgroundSize: "46px 46px",
      }}
    >
      {/* ================================================================ */}
      {/* Animated background                                               */}
      {/* ================================================================ */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-70">
        <div className="absolute -left-40 -top-40 h-[420px] w-[420px] animate-pulse rounded-full bg-[#c9b98c]/18 blur-3xl" />

        <div className="absolute right-[-150px] top-[10%] h-[420px] w-[420px] animate-pulse rounded-full bg-[#9f9475]/14 blur-3xl [animation-delay:1s]" />

        <div className="absolute bottom-[-180px] left-[30%] h-[420px] w-[420px] animate-pulse rounded-full bg-[#9f916b]/12 blur-3xl [animation-delay:2s]" />

        <div className="absolute left-[15%] top-[25%] h-2 w-2 animate-bounce rounded-full bg-[#a68e57]/45 [animation-delay:.5s]" />

        <div className="absolute right-[20%] top-[38%] h-2 w-2 animate-bounce rounded-full bg-[#8f805c]/45 [animation-delay:1.3s]" />

        <div className="absolute bottom-[25%] right-[30%] h-1.5 w-1.5 animate-bounce rounded-full bg-[#9f916b]/40 [animation-delay:1.8s]" />
      </div>

      {/* ================================================================ */}
      {/* Top navigation                                                    */}
      {/* ================================================================ */}

      <header className="relative z-20 border-b border-[#ddd7ca]/80 bg-[#f5f1e7]/92 backdrop-blur-xl">
        <div className="mx-auto flex h-[78px] max-w-6xl items-center justify-between px-5 md:px-8">
          <Link
            href="/dashboard"
            className="group flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#171816] text-[#f5f1e7] shadow-lg shadow-black/10 transition-transform duration-300 group-hover:scale-105">
              <span className="font-serif text-lg font-bold">T</span>
            </div>

            <div>
              <p className="font-serif text-[19px] font-bold tracking-tight text-[#171816]">
                TripWise
              </p>

              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8b7545]">
                Group travel
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-full border border-[#d6cfbf] bg-[#faf8f1] px-4 py-2.5 text-xs font-bold text-[#6f6b62] transition hover:border-[#cdbf9f] hover:bg-[#eee8da] hover:text-[#8b7545]"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">
              Back to Dashboard
            </span>
            <span className="sm:hidden">
              Back
            </span>
          </Link>
        </div>
      </header>

      {/* ================================================================ */}
      {/* Content                                                           */}
      {/* ================================================================ */}

      <div className="relative z-10 mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-12">
        {/* Page heading */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[#ded4b9] bg-[#eee8da] px-3.5 py-2 text-xs font-bold text-[#8b7545]">
            <Sparkles size={13} />
            GROUP TRAVEL, WITHOUT THE AWKWARD MATH
          </div>

          <h1 className="font-serif text-4xl font-bold leading-[1.02] tracking-[-0.035em] text-[#171816] md:text-5xl">
            Make the trip memorable.
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#6f6b62] md:text-base">
            Set up the trip once. TripWise keeps the people, dates and destination ready for everything that follows.
          </p>
        </div>

        {/* ============================================================ */}
        {/* Form                                                          */}
        {/* ============================================================ */}

        <form onSubmit={handleCreateTrip}>
          <div className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
            {/* ======================================================== */}
            {/* Left card                                                  */}
            {/* ======================================================== */}

            <section className="overflow-hidden rounded-[28px] border border-[#ddd7ca] bg-[#faf8f1]/92 shadow-[0_20px_70px_rgba(23,24,22,0.07)] backdrop-blur-xl">
              {/* Card heading */}
              <div className="border-b border-[#e5dfd2] px-6 py-5 md:px-7">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9e5d9] text-[#30483e]">
                    <MapPin size={19} />
                  </div>

                  <div>
                    <h2 className="font-serif text-lg font-bold text-[#171816]">
                      Trip details
                    </h2>

                    <p className="mt-0.5 text-xs text-[#8b867b]">
                      Tell us where you're going.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6 p-6 md:p-7">
                {/* Trip name */}
                <div>
                  <label className="mb-2 block text-xs font-bold text-[#35352f]">
                    Trip name
                  </label>

                  <input
                    type="text"
                    value={tripName}
                    onChange={(event) =>
                      setTripName(event.target.value)
                    }
                    placeholder="e.g. Goa Weekend"
                    disabled={creating}
                    className="h-12 w-full rounded-xl border border-[#ddd7ca] bg-[#f0ece2]/55 px-4 text-sm font-medium text-[#171816] outline-none transition placeholder:text-[#aaa497] focus:border-[#8b7545] focus:bg-[#faf8f1] focus:ring-4 focus:ring-[#c9b98c]/20 disabled:opacity-60"
                  />
                </div>

                {/* Destination */}
                <div>
                  <label className="mb-2 block text-xs font-bold text-[#35352f]">
                    Destination
                  </label>

                  <div className="relative">
                    <MapPin
                      size={17}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b867b]"
                    />

                    <input
                      type="text"
                      value={destination}
                      onChange={(event) =>
                        setDestination(event.target.value)
                      }
                      placeholder="e.g. Goa, India"
                      disabled={creating}
                      className="h-12 w-full rounded-xl border border-[#ddd7ca] bg-[#f0ece2]/55 pl-11 pr-4 text-sm font-medium text-[#171816] outline-none transition placeholder:text-[#aaa497] focus:border-[#8b7545] focus:bg-[#faf8f1] focus:ring-4 focus:ring-[#c9b98c]/20 disabled:opacity-60"
                    />
                  </div>
                </div>

                {/* Dates */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#35352f]">
                      Start date
                    </label>

                    <div className="relative">
                      <CalendarDays
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8b7545]"
                      />

                      <input
                        type="date"
                        value={startDate}
                        onChange={(event) =>
                          setStartDate(event.target.value)
                        }
                        disabled={creating}
                        className="h-12 w-full rounded-xl border border-[#ddd7ca] bg-[#f0ece2]/70 pl-11 pr-3 text-sm font-medium text-[#35352f] outline-none transition focus:border-[#a99460] focus:bg-[#faf8f1] focus:ring-4 focus:ring-[#c9b98c]/25 disabled:opacity-60"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-bold text-[#35352f]">
                      End date
                    </label>

                    <div className="relative">
                      <CalendarDays
                        size={16}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-[#536050]"
                      />

                      <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(event) =>
                          setEndDate(event.target.value)
                        }
                        disabled={creating}
                        className="h-12 w-full rounded-xl border border-[#ddd7ca] bg-[#f0ece2]/70 pl-11 pr-3 text-sm font-medium text-[#35352f] outline-none transition focus:border-[#718072] focus:bg-[#faf8f1] focus:ring-4 focus:ring-[#a9aa96]/22 disabled:opacity-60"
                      />
                    </div>
                  </div>
                </div>

                {/* Organizer */}
                <div className="rounded-2xl border border-[#ded4b9] bg-gradient-to-r from-blue-50/70 to-indigo-50/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f1e7] font-serif font-bold text-[#30483e] shadow-sm">
                      {loadingUser
                        ? "..."
                        : (
                            userName ||
                            userEmail ||
                            "Y"
                          )
                            .charAt(0)
                            .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#c9b98c]">
                        Trip organizer
                      </p>

                      <p className="mt-0.5 truncate text-sm font-bold text-[#f5f1e7]">
                        {loadingUser
                          ? "Loading your account..."
                          : userName ||
                            userEmail ||
                            "You"}
                      </p>

                      {userEmail && (
                        <p className="truncate text-xs text-white/60">
                          {userEmail}
                        </p>
                      )}
                    </div>

                    <div className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#d9c99d]">
                      <Check size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ======================================================== */}
            {/* Members card                                                */}
            {/* ======================================================== */}

            <section className="overflow-hidden rounded-[28px] border border-[#ddd7ca] bg-[#faf8f1]/92 shadow-[0_20px_70px_rgba(23,24,22,0.07)] backdrop-blur-xl">
              <div className="border-b border-[#e5dfd2] px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9e5d9] text-[#30483e]">
                      <Users size={19} />
                    </div>

                    <div>
                      <h2 className="font-serif text-lg font-bold text-[#171816]">
                        Your group
                      </h2>

                      <p className="mt-0.5 text-xs text-[#8b867b]">
                        Add the people joining.
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-[#e9e4d8] px-2.5 py-1 text-[10px] font-bold text-[#6f6b62]">
                    {members.length + 1} total
                  </span>
                </div>
              </div>

              <div className="p-6">
                <div className="mb-4 rounded-2xl bg-[#eee9de] p-3.5">
                  <div className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#faf8f1] text-[#536050] shadow-sm">
                      <UserPlus size={16} />
                    </div>

                    <div>
                      <p className="text-xs font-bold text-[#35352f]">
                        Invite your crew
                      </p>

                      <p className="mt-1 text-[11px] leading-5 text-[#8b867b]">
                        Add names and emails now. These members
                        will be available for expense splitting
                        later.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {members.map((member, index) => (
                    <div
                      key={member.id}
                      className="group rounded-2xl border border-[#ddd7ca] bg-[#faf8f1] p-3 transition hover:border-[#d2c7ad] hover:shadow-sm"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8b867b]">
                          Member {index + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            removeMember(member.id)
                          }
                          disabled={creating}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[#aaa497] transition hover:bg-[#f6ece7] hover:text-[#a16a5b] disabled:opacity-40"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={member.name}
                          onChange={(event) =>
                            updateMember(
                              member.id,
                              "name",
                              event.target.value
                            )
                          }
                          placeholder="Member name"
                          disabled={creating}
                          className="h-10 w-full rounded-lg border border-[#ddd7ca] bg-[#f0ece2]/65 px-3 text-xs font-medium outline-none transition placeholder:text-[#aaa497] focus:border-[#718072] focus:bg-[#faf8f1] focus:ring-4 focus:ring-[#a9aa96]/22"
                        />

                        <input
                          type="email"
                          value={member.email}
                          onChange={(event) =>
                            updateMember(
                              member.id,
                              "email",
                              event.target.value
                            )
                          }
                          placeholder="Email address"
                          disabled={creating}
                          className="h-10 w-full rounded-lg border border-[#ddd7ca] bg-[#f0ece2]/65 px-3 text-xs font-medium outline-none transition placeholder:text-[#aaa497] focus:border-[#718072] focus:bg-[#faf8f1] focus:ring-4 focus:ring-[#a9aa96]/22"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addMember}
                  disabled={creating}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#d2c7ad] bg-[#e9e5d9]/40 px-4 py-3 text-xs font-bold text-[#30483e] transition hover:border-[#c3b796] hover:bg-[#e9e5d9] disabled:opacity-50"
                >
                  <Plus size={15} />
                  Add another member
                </button>
              </div>
            </section>
          </div>

          {/* ========================================================== */}
          {/* Error / success                                             */}
          {/* ========================================================== */}

          {(error || success) && (
            <div
              className={`mt-6 flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm ${
                error
                  ? "border-[#ead5cb] bg-[#f6ece7] text-[#7e5146]"
                  : "border-[#d7e2d5] bg-[#e8eee7] text-emerald-700"
              }`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                  error
                    ? "bg-[#faf8f1] text-[#a16a5b]"
                    : "bg-[#faf8f1] text-[#486153]"
                }`}
              >
                {error ? (
                  <X size={16} />
                ) : (
                  <Check size={16} />
                )}
              </div>

              <div className="pt-1">
                <p className="font-bold">
                  {error || success}
                </p>

                {error && (
                  <p className="mt-1 text-xs opacity-70">
                    Check the fields above and try again.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ========================================================== */}
          {/* Bottom action                                                */}
          {/* ========================================================== */}

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/dashboard"
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#ddd7ca] bg-[#faf8f1] px-5 text-sm font-bold text-[#6f6b62] transition hover:border-[#c9c2b4] hover:text-[#35352f]"
            >
              <ArrowLeft size={16} />
              Cancel
            </Link>

            <button
              type="submit"
              disabled={creating || loadingUser}
              className="group relative flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#171816] px-6 text-sm font-bold text-[#f5f1e7] shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:bg-[#30483e] hover:shadow-xl hover:shadow-black/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="absolute inset-0 -translate-x-full bg-[#faf8f1]/10 transition-transform duration-700 group-hover:translate-x-full" />

              {creating ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Creating trip...
                </>
              ) : (
                <>
                  Create Trip
                  <ArrowRight
                    size={17}
                    className="transition-transform group-hover:translate-x-1"
                  />
                </>
              )}
            </button>
          </div>
        </form>

        {/* ============================================================ */}
        {/* Footer hint                                                   */}
        {/* ============================================================ */}

        <div className="mt-8 flex items-center justify-center gap-2 text-center text-[11px] font-medium text-[#8b867b]">
          <Sparkles
            size={13}
            className="text-indigo-400"
          />

          You can add expenses, bookings and itinerary items
          after creating the trip.
        </div>
      </div>
    </main>
  );
}