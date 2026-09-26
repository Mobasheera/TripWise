"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Banknote,
  Check,
  IndianRupee,
  Info,
  Loader2,
  Smartphone,
} from "lucide-react";
import { clearUpiId, saveUpiId } from "@/lib/supabase";
import { isValidUpiId } from "@/lib/validators";

type Method = "cash" | "upi" | null;

export default function PaymentMethodPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("upi");
  const [upiId, setUpiId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const upiTouched = method === "upi" && upiId.length > 0;
  const upiValid = method === "upi" && isValidUpiId(upiId);
  const canContinue = method === "cash" || upiValid;

  const inputState = !upiTouched ? "neutral" : upiValid ? "valid" : "invalid";

  const inputClasses = {
    neutral: "border-line focus:border-ink focus:ring-line/40",
    valid:
      "border-emerald-500 text-emerald-700 focus:border-emerald-500 focus:ring-emerald-200",
    invalid: "border-red-500 text-red-600 focus:ring-red-200",
  }[inputState];

  async function handleContinue() {
    if (!canContinue || saving) return;

    setSaving(true);
    setError("");

    try {
      if (method === "upi") {
        await saveUpiId(upiId);
      } else {
        await clearUpiId();
      }

      router.replace("/dashboard");
    } catch (error) {
      console.error("Could not save payment preference:", error);
      setError(
        error instanceof Error
          ? error.message
          : "We could not save your payment preference. Please try again.",
      );
      setSaving(false);
    }
  }

  return (
    <main className="page-grid flex min-h-screen items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-md rounded-[1.6rem] border border-line bg-[#fffdf7] p-8 shadow-soft">
        <p className="eyebrow text-center">Almost there</p>
        <h1 className="display mt-3 text-center text-3xl leading-tight sm:text-[2rem]">
          How will you primarily settle expenses?
        </h1>
        <p className="mt-3 text-center text-sm leading-6 text-stone-500">
          This helps us personalize your experience. You can always change this later.
        </p>

        <div className="mt-7 grid grid-cols-2 gap-3">
          <button
            type="button"
            aria-pressed={method === "cash"}
            onClick={() => setMethod("cash")}
            className={`relative rounded-2xl border p-5 text-center transition ${
              method === "cash"
                ? "border-pine bg-pine/5"
                : "border-line hover:border-stone-400"
            }`}
          >
            {method === "cash" && (
              <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-pine text-paper">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
            <Banknote className="mx-auto text-stone-500" size={28} />
            <p className="mt-3 text-sm font-semibold">Cash</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              I&apos;ll mostly use cash for my expenses
            </p>
          </button>

          <button
            type="button"
            aria-pressed={method === "upi"}
            onClick={() => setMethod("upi")}
            className={`relative rounded-2xl border p-5 text-center transition ${
              method === "upi"
                ? "border-pine bg-pine/5"
                : "border-line hover:border-stone-400"
            }`}
          >
            {method === "upi" && (
              <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-pine text-paper">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
            <Smartphone className="mx-auto text-stone-500" size={28} />
            <p className="mt-3 text-sm font-semibold">UPI</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">
              I&apos;ll mostly use UPI for my expenses
            </p>
          </button>
        </div>

        {method === "upi" && (
          <div className="mt-6">
            <label htmlFor="upiId" className="text-sm font-semibold">
              Enter your UPI ID
            </label>
            <div className="relative mt-2">
              <IndianRupee
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                id="upiId"
                type="text"
                inputMode="email"
                autoComplete="off"
                spellCheck={false}
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@okhdfcbank"
                className={`w-full rounded-xl border bg-white py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-stone-400 focus:ring-2 ${inputClasses}`}
              />
            </div>
            <p
              className={`mt-2 flex items-start gap-1.5 text-xs leading-5 ${
                inputState === "invalid" ? "text-red-600" : "text-stone-500"
              }`}
            >
              <Info size={13} className="mt-0.5 shrink-0" />
              {inputState === "invalid"
                ? "That doesn't look like a valid UPI ID — it should look like name@bank."
                : "Your UPI ID usually looks like name@bank (e.g. rahul@okicici)"}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
            {error}
          </div>
        )}

        <button
          type="button"
          disabled={!canContinue || saving}
          onClick={handleContinue}
          className={`mt-7 flex w-full items-center justify-center gap-2 rounded-full py-3.5 text-sm font-semibold transition ${
            canContinue && !saving
              ? "bg-pine text-paper hover:bg-[#16261f]"
              : "cursor-not-allowed bg-stone-200 text-stone-400"
          }`}
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Saving preference…
            </>
          ) : (
            <>
              Continue to Dashboard <ArrowRight size={16} />
            </>
          )}
        </button>
        <p className="mt-3 text-center text-xs text-stone-500">
          You can always change this later in settings.
        </p>
      </div>
    </main>
  );
}
