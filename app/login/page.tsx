"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getCurrentUser, getSupabase, signInWithGoogle } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      try {
        const user = await getCurrentUser();

        if (!mounted) return;

        if (user) {
          router.replace("/dashboard");
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error(err);

        if (mounted) {
          setLoading(false);
        }
      }
    }

    checkSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleGoogleLogin() {
    try {
      setError("");
      setSigningIn(true);

      await signInWithGoogle();
    } catch (err) {
      console.error(err);

      setError("Unable to start Google sign-in. Please try again.");
      setSigningIn(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f1e7]">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#191a18] text-sm font-bold text-white">
            T
          </div>

          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#191a18]/20 border-t-[#191a18]" />

          <p className="text-sm text-[#777269]">
            Checking your TripWise account...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f1e7] text-[#181916]">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(24,25,22,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(24,25,22,.055) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
      </div>

      {/* Navbar */}
      <header className="relative z-10 border-b border-[#1b1c18]/10 bg-[#f5f1e7]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[78px] max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#191a18] text-sm font-bold text-white">
              T
            </span>

            <span className="font-serif text-[25px] font-bold tracking-[-0.04em]">
              TripWise
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[#625f57] transition hover:text-[#191a18]"
          >
            <ArrowLeft size={16} />
            Back home
          </Link>
        </div>
      </header>

      {/* Main */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-78px)] max-w-[1280px] items-center px-5 py-12 sm:px-8 lg:px-10">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[1fr_0.8fr]">
          {/* Left */}
          <div className="hidden lg:block">
            <div className="max-w-[620px]">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#75643e]/20 bg-[#eee5d2] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#806a37]">
                <Sparkles size={13} />
                Welcome to TripWise
              </div>

              <h1 className="font-serif text-6xl leading-[0.9] tracking-[-0.06em] xl:text-7xl">
                Your next trip
                <br />
                <span className="text-[#7c786f]">starts here.</span>
              </h1>

              <p className="mt-7 max-w-xl text-[17px] leading-8 text-[#625f57]">
                Sign in to manage your trips, expenses, bookings, receipts,
                balances and settlements in one shared space.
              </p>

              <div className="mt-9 space-y-3">
                <LoginBenefit text="Plan trips with your group" />
                <LoginBenefit text="Track shared expenses and receipts" />
                <LoginBenefit text="Automatically calculate settlements" />
              </div>
            </div>
          </div>

          {/* Login card */}
          <div className="mx-auto w-full max-w-[470px]">
            <div className="rounded-[34px] border border-[#292a25]/10 bg-[#fbf8f0] p-3 shadow-[0_30px_80px_rgba(44,40,29,.12)]">
              <div className="rounded-[27px] border border-[#292a25]/10 bg-[#f6f2e8] p-6 sm:p-9">
                {/* Mobile heading */}
                <div className="mb-8 lg:hidden">
                  <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#75643e]/20 bg-[#eee5d2] px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#806a37]">
                    <Sparkles size={12} />
                    Welcome to TripWise
                  </div>

                  <h1 className="font-serif text-4xl leading-[0.95] tracking-[-0.05em]">
                    Your next trip
                    <br />
                    <span className="text-[#7c786f]">starts here.</span>
                  </h1>
                </div>

                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#191a18] text-lg font-bold text-white">
                    T
                  </div>

                  <h2 className="mt-6 font-serif text-3xl tracking-[-0.04em]">
                    Welcome back
                  </h2>

                  <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#777269]">
                    Sign in to continue to your TripWise dashboard.
                  </p>
                </div>

                {error && (
                  <div className="mt-6 rounded-2xl border border-red-900/10 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={signingIn}
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-[#292a25]/15 bg-white px-5 py-4 text-sm font-bold text-[#292a25] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fffefa] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signingIn ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#292a25]/20 border-t-[#292a25]" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <GoogleIcon />
                      Continue with Google
                      <ArrowRight size={16} className="ml-auto" />
                    </>
                  )}
                </button>

                <div className="my-7 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[#292a25]/10" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#aaa397]">
                    Secure sign in
                  </span>
                  <div className="h-px flex-1 bg-[#292a25]/10" />
                </div>

                <div className="rounded-[22px] border border-[#292a25]/10 bg-[#eee7d9]/70 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#dce8d4] text-[#50644a]">
                      <Check size={16} />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-[#292a25]">
                        One account for every trip
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#777269]">
                        Your trips, expenses, bookings and settlements stay
                        connected to your account.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-7 text-center text-[11px] leading-5 text-[#8a857c]">
                  By continuing, you agree to use TripWise for your group
                  travel planning and expense management.
                </p>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-[#8a857c]">
              New here?{" "}
              <span className="font-bold text-[#292a25]">
                Your account will be created automatically.
              </span>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function LoginBenefit({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-[#625f57]">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#dfe8d9] text-[#496044]">
        <Check size={14} />
      </span>

      {text}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.23c0-.73-.07-1.43-.21-2.1H12v3.98h5.24a4.48 4.48 0 0 1-1.95 2.94v2.44h3.15c1.85-1.7 2.91-4.2 2.91-7.26Z"
      />
      <path
        fill="#34A853"
        d="M12 21.6c2.64 0 4.86-.87 6.48-2.35l-3.15-2.44c-.87.58-1.98.92-3.33.92-2.56 0-4.73-1.73-5.51-4.06H3.23v2.52A9.79 9.79 0 0 0 12 21.6Z"
      />
      <path
        fill="#FBBC05"
        d="M6.49 13.67A5.88 5.88 0 0 1 6.18 12c0-.58.11-1.14.31-1.67V7.81H3.23A9.6 9.6 0 0 0 2.2 12c0 1.52.36 2.96 1.03 4.19l3.26-2.52Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.27c1.44 0 2.73.5 3.75 1.48l2.8-2.8C16.86 3.34 14.64 2.4 12 2.4a9.79 9.79 0 0 0-8.77 5.41l3.26 2.52C7.27 8 9.44 6.27 12 6.27Z"
      />
    </svg>
  );
}