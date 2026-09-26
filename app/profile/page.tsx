"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  Loader2,
  LogOut,
  Mail,
  Save,
  ShieldCheck,
  User,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  getSupabase,
  saveProfile,
  signOut,
} from "@/lib/supabase";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  upi_id: string | null;
};

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] =
    useState<Profile | null>(null);

  const [name, setName] = useState("");
  const [upiId, setUpiId] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");

      const supabase = getSupabase();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/login");
        return;
      }

      const { data, error: profileError } =
        await supabase
          .from("profiles")
          .select(
            "id, name, email, avatar_url, upi_id"
          )
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      /*
       * If profile doesn't exist, create it from
       * Google information.
       */
      if (!data) {
        const metadata =
          user.user_metadata || {};

        const defaultName =
          metadata.full_name ||
          metadata.name ||
          user.email?.split("@")[0] ||
          "Traveler";

        const defaultAvatar =
          metadata.avatar_url ||
          metadata.picture ||
          null;

        const { data: createdProfile, error: createError } =
          await supabase
            .from("profiles")
            .insert({
              id: user.id,
              name: defaultName,
              email: user.email || null,
              avatar_url: defaultAvatar,
              upi_id: null,
            })
            .select(
              "id, name, email, avatar_url, upi_id"
            )
            .single();

        if (createError) {
          throw createError;
        }

        setProfile(createdProfile);
        setName(createdProfile.name || "");
        setUpiId(createdProfile.upi_id || "");

        return;
      }

      setProfile(data);
      setName(data.name || "");
      setUpiId(data.upi_id || "");
    } catch (err) {
      console.error(
        "Profile loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your profile."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const saved = await saveProfile({
        name,
        email: profile?.email,
        avatar_url: profile?.avatar_url,
        upi_id: upiId,
      });

      setProfile(saved);

      setName(saved.name || "");
      setUpiId(saved.upi_id || "");

      setSuccess(
        "Your profile and UPI ID have been saved."
      );
    } catch (err) {
      console.error(
        "Profile save error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    try {
      setLoggingOut(true);
      setError("");

      await signOut();

      /*
       * Force navigation after Supabase clears
       * the local session.
       */
      window.location.href = "/login";
    } catch (err) {
      console.error(
        "Sign out error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign out."
      );

      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f1e7]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#191a18] text-sm font-bold text-white">
            T
          </div>

          <Loader2
            size={20}
            className="animate-spin text-[#191a18]"
          />

          <p className="text-sm text-[#777269]">
            Loading your profile...
          </p>
        </div>
      </main>
    );
  }

  const displayName =
    name.trim() || "Traveler";

  const initial = displayName
    .charAt(0)
    .toUpperCase();

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f1e7] text-[#181916]">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(24,25,22,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(24,25,22,.055) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[#292a25]/10 bg-[#f5f1e7]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[78px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#191a18] text-sm font-bold text-white">
              T
            </span>

            <span className="font-serif text-[25px] font-bold tracking-[-0.04em]">
              TripWise
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-full border border-[#292a25]/10 bg-white/70 px-4 py-2 text-xs font-bold text-[#555249] transition hover:bg-white"
          >
            <ArrowLeft size={14} />
            Dashboard
          </Link>
        </div>
      </header>

      {/* Page */}
      <div className="relative z-10 mx-auto max-w-[1180px] px-5 py-10 sm:px-8 lg:py-14">
        {/* Heading */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#806a37]">
            Account
          </p>

          <h1 className="mt-3 font-serif text-5xl tracking-[-0.055em]">
            Your profile
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-[#777269]">
            Keep your personal information and payment
            details ready for group trips and settlements.
          </p>
        </div>

        {/* Messages */}
        {success && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#50644a]/15 bg-[#e3eadf] px-4 py-3 text-sm font-medium text-[#42543d]">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/70">
              <Check size={15} />
            </span>

            {success}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-900/10 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[0.72fr_1.28fr]">
          {/* Profile summary */}
          <section className="rounded-[30px] border border-[#292a25]/10 bg-[#fbf8f0] p-6 shadow-[0_20px_60px_rgba(44,40,29,.06)]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#f5f1e7] bg-[#e8e5d9] font-serif text-4xl text-[#566055] shadow-sm">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initial
                )}
              </div>

              <h2 className="mt-5 font-serif text-2xl">
                {displayName}
              </h2>

              <p className="mt-1 break-all text-xs text-[#8a857c]">
                {profile?.email || "No email"}
              </p>

              <div className="mt-6 flex items-center gap-2 rounded-full bg-[#e3eadf] px-4 py-2 text-xs font-bold text-[#42543d]">
                <ShieldCheck size={14} />
                Account connected
              </div>
            </div>

            <div className="mt-8 border-t border-[#292a25]/10 pt-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eee5d2] text-[#715f3e]">
                  <WalletCards size={17} />
                </div>

                <div>
                  <p className="text-sm font-bold">
                    Settlement ready
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#777269]">
                    Add your UPI ID so other trip members
                    can identify where payments should go.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Edit form */}
          <section className="rounded-[30px] border border-[#292a25]/10 bg-[#fbf8f0] p-6 shadow-[0_20px_60px_rgba(44,40,29,.06)] sm:p-8">
            <div className="mb-7">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#806a37]">
                Personal details
              </p>

              <h2 className="mt-2 font-serif text-3xl tracking-[-0.04em]">
                Profile information
              </h2>
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="mb-2 block text-xs font-bold text-[#4e4b44]">
                  Full name
                </label>

                <div className="relative">
                  <User
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a958a]"
                  />

                  <input
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Your name"
                    className="w-full rounded-2xl border border-[#292a25]/12 bg-white px-4 py-3.5 pl-11 text-sm outline-none transition placeholder:text-[#aaa59a] focus:border-[#292a25]/30 focus:ring-4 focus:ring-[#292a25]/5"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-xs font-bold text-[#4e4b44]">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a958a]"
                  />

                  <input
                    value={profile?.email || ""}
                    disabled
                    className="w-full cursor-not-allowed rounded-2xl border border-[#292a25]/10 bg-[#eeeae0] px-4 py-3.5 pl-11 text-sm text-[#777269] outline-none"
                  />
                </div>

                <p className="mt-2 text-[11px] text-[#999389]">
                  Your Google account email cannot be changed here.
                </p>
              </div>

              {/* UPI */}
              <div>
                <label className="mb-2 block text-xs font-bold text-[#4e4b44]">
                  UPI ID
                </label>

                <div className="relative">
                  <WalletCards
                    size={17}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a958a]"
                  />

                  <input
                    value={upiId}
                    onChange={(event) =>
                      setUpiId(event.target.value)
                    }
                    placeholder="example@upi"
                    className="w-full rounded-2xl border border-[#292a25]/12 bg-white px-4 py-3.5 pl-11 text-sm outline-none transition placeholder:text-[#aaa59a] focus:border-[#292a25]/30 focus:ring-4 focus:ring-[#292a25]/5"
                  />
                </div>

                <p className="mt-2 text-[11px] leading-5 text-[#999389]">
                  This is used when showing settlement payment
                  information to your trip members.
                </p>
              </div>

              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#191a18] px-6 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2b302c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                    Saving changes...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save changes
                  </>
                )}
              </button>
            </div>
          </section>
        </div>

        {/* Sign out */}
        <section className="mt-6 rounded-[30px] border border-red-900/10 bg-[#fbf8f0] p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#292a25]">
                Sign out of TripWise
              </p>

              <p className="mt-1 text-xs leading-5 text-[#8a857c]">
                You can sign back in anytime with your Google account.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              disabled={loggingOut}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-red-900/15 bg-red-50 px-5 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />
                  Signing out...
                </>
              ) : (
                <>
                  <LogOut size={15} />
                  Sign out
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}