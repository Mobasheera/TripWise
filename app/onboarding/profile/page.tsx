"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Camera,
  Check,
  Loader2,
  Mail,
  UserRound,
} from "lucide-react";
import { getAuthenticatedUser, saveProfile } from "@/lib/supabase";

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }

  if (parts.length === 1) {
    return { firstName: parts[0], lastName: "" };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read that image."));
    reader.onload = () => {
      const image = new Image();

      image.onerror = () => reject(new Error("That image could not be opened."));
      image.onload = () => {
        const maxSize = 320;
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");

        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("Your browser could not process that image."));
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };

      image.src = String(reader.result);
    };

    reader.readAsDataURL(file);
  });
}

export default function ProfileOnboardingPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { user, profile } = await getAuthenticatedUser();

        if (!active) return;

        if (profile) {
          router.replace("/dashboard");
          return;
        }

        const metadata = user.metadata;
        const metadataName =
          typeof metadata.full_name === "string"
            ? metadata.full_name
            : typeof metadata.name === "string"
              ? metadata.name
              : "";

        const names = splitName(metadataName);

        setEmail(user.email);
        setFirstName(names.firstName);
        setLastName(names.lastName);

        const avatar =
          typeof metadata.avatar_url === "string"
            ? metadata.avatar_url
            : typeof metadata.picture === "string"
              ? metadata.picture
              : "";

        setAvatarUrl(avatar);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "We could not load your authenticated profile."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [router]);

  const initials = useMemo(() => {
    const first = firstName.trim().charAt(0);
    const last = lastName.trim().charAt(0);

    return (first + last || first || "T").toUpperCase();
  }, [firstName, lastName]);

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Please choose an image smaller than 5 MB.");
      return;
    }

    setError("");

    try {
      setAvatarUrl(await compressImage(file));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "We could not use that image."
      );
    }
  }

  async function handleContinue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter both your first and last name.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveProfile({
        firstName,
        lastName,
        avatarUrl: avatarUrl || null,
      });

      router.replace("/onboarding/payment-method");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We could not save your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="page-grid flex min-h-screen items-center justify-center bg-paper px-6">
        <div className="flex items-center gap-3 text-sm text-stone-500">
          <Loader2 size={18} className="animate-spin" />
          Preparing your TripWise profile…
        </div>
      </main>
    );
  }

  return (
    <main className="page-grid flex min-h-screen items-center justify-center bg-paper px-6 py-12">
      <div className="w-full max-w-lg rounded-[2rem] border border-line bg-[#fffdf7] p-7 shadow-soft sm:p-9">
        <div className="text-center">
          <p className="eyebrow">Your profile</p>
          <h1 className="display mt-3 text-4xl leading-tight sm:text-5xl">
            Let&apos;s get to know you.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-stone-500">
            Google already gave us your basics when available. Email users can
            add their name here before continuing to onboarding.
          </p>
        </div>

        <form onSubmit={handleContinue} className="mt-8">
          <div className="flex flex-col items-center">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-24 w-24 rounded-full border border-line object-cover"
                />
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-full bg-pine text-2xl font-semibold text-paper">
                  {initials}
                </div>
              )}

              <label
                htmlFor="avatar"
                className="absolute bottom-0 right-0 grid h-9 w-9 cursor-pointer place-items-center rounded-full border-2 border-[#fffdf7] bg-ink text-paper shadow-sm hover:bg-pine"
                title="Choose profile photo"
              >
                <Camera size={15} />
              </label>

              <input
                id="avatar"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleAvatar}
              />
            </div>

            <p className="mt-3 text-xs text-stone-500">
              Add a profile photo{" "}
              <span className="text-stone-400">(optional)</span>
            </p>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              First name
              <div className="relative mt-2">
                <UserRound
                  size={16}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  placeholder="First name"
                  className="w-full rounded-xl border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-line/40"
                />
              </div>
            </label>

            <label className="text-sm font-semibold">
              Last name
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                placeholder="Last name"
                className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm outline-none focus:border-ink focus:ring-2 focus:ring-line/40"
              />
            </label>
          </div>

          <label className="mt-5 block text-sm font-semibold">
            Email
            <div className="relative mt-2">
              <Mail
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                value={email}
                readOnly
                className="w-full rounded-xl border border-line bg-paper py-3 pl-10 pr-12 text-sm text-stone-600 outline-none"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-pine">
                <Check size={16} strokeWidth={2.5} />
              </span>
            </div>
            <p className="mt-2 text-xs font-normal text-stone-500">
              This is the email address you authenticated with.
            </p>
          </label>

          {error && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !firstName.trim() || !lastName.trim()}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-pine py-3.5 text-sm font-semibold text-paper transition hover:bg-[#16261f] disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving profile…
              </>
            ) : (
              <>
                Continue to Payment Setup
                <ArrowRight size={16} />
              </>
            )}
          </button>

          <p className="mt-3 text-center text-xs text-stone-500">
            You can update your profile later.
          </p>
        </form>
      </div>
    </main>
  );
}
