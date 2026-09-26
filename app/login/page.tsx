"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { sendMagicLink, signInWithGoogle } from "@/lib/supabase";

type AuthMode = "email" | "sent";

export default function LoginPage() {
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [mode, setMode] = useState<AuthMode>("email");
  const [error, setError] = useState("");
  const [callbackError, setCallbackError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get("error");

    if (!errorCode) return;

    const messages: Record<string, string> = {
      oauth: "Google sign-in could not be completed. Please try again.",
      magic_link: "That email sign-in link is invalid or has expired. Request a new one.",
      profile: "We signed you in, but could not load your TripWise profile.",
      supabase_config: "TripWise is missing its Supabase configuration.",
    };

    setCallbackError(
      messages[errorCode] ?? "Something went wrong while signing you in."
    );
  }, []);

  async function handleGoogle() {
    setLoadingGoogle(true);
    setError("");
    setCallbackError("");

    try {
      await signInWithGoogle();
    } catch (err) {
      setLoadingGoogle(false);
      setError(
        err instanceof Error
          ? err.message
          : "Google sign-in could not be started."
      );
    }
  }

  async function handleEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Enter your email address to continue.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Enter a valid email address.");
      return;
    }

    setLoadingEmail(true);
    setError("");
    setCallbackError("");

    try {
      await sendMagicLink(normalizedEmail);
      setEmail(normalizedEmail);
      setMode("sent");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not send the sign-in link."
      );
    } finally {
      setLoadingEmail(false);
    }
  }

  function resetEmailFlow() {
    setMode("email");
    setError("");
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="page-grid hidden border-r border-line p-10 lg:flex lg:flex-col lg:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-ink font-bold text-paper">
              T
            </div>
            <span className="display text-xl font-semibold">TripWise</span>
          </Link>

          <div className="max-w-xl">
            <p className="eyebrow">Your group ledger</p>
            <h1 className="display mt-5 text-7xl leading-[.92]">
              Everyone knows what they owe.
            </h1>
            <p className="mt-7 max-w-md text-base leading-7 text-stone-600">
              Sign in with Google or use your email. Email sign-in is
              passwordless — we&apos;ll send you a secure link instead of
              asking you to remember another password.
            </p>

            <div className="mt-8 space-y-3">
              {[
                "Google or any email address",
                "No password to remember",
                "UPI ID collected once during onboarding",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-[#e5dac2] text-pine">
                    <Check size={14} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-stone-500">
            TripWise · built for group travel
          </p>
        </section>

        <section className="flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <Link
              href="/"
              className="mb-12 inline-flex items-center gap-2 text-sm text-stone-500 hover:text-ink lg:hidden"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <div className="mb-10 lg:hidden">
              <p className="eyebrow">TripWise</p>
              <h1 className="display mt-3 text-5xl">Your trip starts here.</h1>
            </div>

            <div className="rounded-[2rem] border border-line bg-[#fffdf7] p-7 shadow-soft sm:p-9">
              <p className="eyebrow">Create account / sign in</p>
              <h2 className="display mt-3 text-4xl">Welcome to TripWise.</h2>

              <p className="mt-3 text-sm leading-6 text-stone-500">
                Use Google, or continue with any email provider. No password
                required.
              </p>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loadingGoogle || loadingEmail}
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border border-stone-300 bg-white px-5 py-3.5 text-sm font-semibold hover:border-ink disabled:opacity-60"
              >
                {loadingGoogle ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-stone-200 text-[11px] font-bold">
                    G
                  </span>
                )}
                {loadingGoogle ? "Opening Google…" : "Continue with Google"}
                {!loadingGoogle && (
                  <ArrowRight size={16} className="ml-auto" />
                )}
              </button>

              <div className="my-7 flex items-center gap-3 text-[11px] uppercase tracking-[.14em] text-stone-400">
                <span className="h-px flex-1 bg-line" />
                or
                <span className="h-px flex-1 bg-line" />
              </div>

              {mode === "sent" ? (
                <div className="rounded-2xl border border-line bg-paper p-5">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e5dac2] text-pine">
                    <Mail size={21} />
                  </div>
                  <h3 className="display mt-5 text-center text-3xl">
                    Check your inbox.
                  </h3>
                  <p className="mt-3 text-center text-sm leading-6 text-stone-500">
                    We sent a secure sign-in link to{" "}
                    <span className="font-semibold text-ink">{email}</span>.
                    Open it to continue to TripWise.
                  </p>

                  <button
                    type="button"
                    onClick={resetEmailFlow}
                    className="mt-5 w-full rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold hover:border-ink"
                  >
                    Use a different email
                  </button>
                </div>
              ) : (
                <form onSubmit={handleEmail}>
                  <label
                    htmlFor="email"
                    className="text-sm font-semibold text-ink"
                  >
                    Email address
                  </label>
                  <div className="relative mt-2">
                    <Mail
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                    />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      disabled={loadingEmail}
                      className="w-full rounded-xl border border-stone-300 bg-white py-3.5 pl-10 pr-4 text-sm outline-none transition placeholder:text-stone-400 focus:border-ink focus:ring-2 focus:ring-line/40 disabled:opacity-60"
                    />
                  </div>

                  <p className="mt-2 text-xs leading-5 text-stone-500">
                    We&apos;ll email you a one-time secure link. No password is
                    stored or required.
                  </p>

                  <button
                    type="submit"
                    disabled={loadingEmail || loadingGoogle}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-pine py-3.5 text-sm font-semibold text-paper transition hover:bg-[#16261f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingEmail ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Sending secure link…
                      </>
                    ) : (
                      <>
                        Continue with Email
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>
              )}

              {(error || callbackError) && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
                  {error || callbackError}
                </div>
              )}

              <div className="my-7 flex items-center gap-3 text-[11px] uppercase tracking-[.14em] text-stone-400">
                <span className="h-px flex-1 bg-line" />
                secure onboarding
                <span className="h-px flex-1 bg-line" />
              </div>

              <div className="rounded-xl bg-paper p-4">
                <div className="flex gap-3">
                  <ShieldCheck
                    className="mt-0.5 shrink-0 text-pine"
                    size={18}
                  />
                  <div>
                    <p className="text-xs font-semibold">
                      Your sign-in stays passwordless
                    </p>
                    <p className="mt-1 text-xs leading-5 text-stone-500">
                      Google handles Google accounts. For any other email
                      provider, Supabase sends a one-time link to the address
                      you entered.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-stone-400">
              By continuing, you agree to use TripWise for legitimate
              group-expense tracking.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
