"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BellOff,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Globe2,
  Info,
  Languages,
  Loader2,
  LogOut,
  MapPinned,
  Moon,
  ReceiptText,
  ShieldCheck,
  SlidersHorizontal,
  User,
  WalletCards,
} from "lucide-react";

import {
  getCurrentUser,
  signOut,
} from "@/lib/supabase";

type SettingsState = {
  tripReminders: boolean;
  expenseNotifications: boolean;
  settlementNotifications: boolean;
  receiptScanning: boolean;
  defaultSplit: "equal" | "custom";
  currency: string;
  language: string;
  darkMode: boolean;
};

type UserSummary = {
  id: string;
  name: string;
  email: string;
  avatar_url: string;
  avatar?: string;
};

const DEFAULT_SETTINGS: SettingsState = {
  tripReminders: true,
  expenseNotifications: true,
  settlementNotifications: true,
  receiptScanning: true,
  defaultSplit: "equal",
  currency: "INR",
  language: "English",
  darkMode: false,
};

const SETTINGS_STORAGE_KEY = "tripwise-settings";

export default function SettingsPage() {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [settings, setSettings] =
    useState<SettingsState>(DEFAULT_SETTINGS);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      setLoading(true);
      setError("");

      const currentUser = await getCurrentUser();

      if (!currentUser) {
        window.location.href = "/login";
        return;
      }

      setUser({
        id: currentUser.id,
        name: currentUser.name || "",
        email: currentUser.email || "",
        avatar_url:
          currentUser.avatar_url ||
          currentUser.avatar ||
          "",
        avatar:
          currentUser.avatar ||
          currentUser.avatar_url ||
          "",
      });

      try {
        const saved =
          window.localStorage.getItem(
            SETTINGS_STORAGE_KEY
          );

        if (saved) {
          const parsed = JSON.parse(saved);

          setSettings({
            ...DEFAULT_SETTINGS,
            ...parsed,
          });
        }
      } catch (storageError) {
        console.warn(
          "Unable to load saved settings:",
          storageError
        );
      }
    } catch (err: any) {
      console.error(
        "Settings loading error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load your settings."
      );
    } finally {
      setLoading(false);
    }
  }

  function updateSetting<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));

    setSuccess("");
    setError("");
  }

  function saveSettings() {
    try {
      setSaving(true);
      setSuccess("");
      setError("");

      window.localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(settings)
      );

      setTimeout(() => {
        setSaving(false);
        setSuccess(
          "Your TripWise preferences have been saved."
        );
      }, 350);
    } catch (err: any) {
      console.error(
        "Settings save error:",
        err
      );

      setSaving(false);

      setError(
        err?.message ||
          "Unable to save your settings."
      );
    }
  }

  async function handleSignOut() {
    try {
      setSigningOut(true);
      setError("");

      await signOut();

      window.location.href = "/login";
    } catch (err: any) {
      console.error(
        "Sign out error:",
        err
      );

      setError(
        err?.message ||
          "Unable to sign out."
      );

      setSigningOut(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f0e6] text-[#191917]">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-3 rounded-2xl border border-[#292a25]/10 bg-[#f8f5ec] px-5 py-4 text-sm font-bold shadow-lg">
            <Loader2
              size={18}
              className="animate-spin text-[#355244]"
            />

            Loading settings...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f0e6] text-[#191917]">
      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              "linear-gradient(rgba(31,39,34,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(31,39,34,.055) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />

        <div className="absolute right-0 top-20 h-[500px] w-[500px] rounded-full bg-[#d8d0bd]/30 blur-3xl" />

        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] rounded-full bg-[#cfd7c6]/30 blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 flex h-[86px] items-center justify-between border-b border-[#292a25]/10 bg-[#f4f0e6]/95 px-5 backdrop-blur-xl md:px-8">
        <Link
          href="/dashboard"
          className="flex items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#191a18] font-serif text-lg font-bold text-[#f4f0e6]">
            T
          </span>

          <span>
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
          className="inline-flex items-center gap-2 rounded-full border border-[#292a25]/15 bg-[#f8f5ec] px-4 py-2.5 text-xs font-bold transition hover:bg-white"
        >
          <ArrowLeft size={15} />
          Dashboard
        </Link>
      </header>

      {/* Main */}
      <section className="mx-auto w-full max-w-6xl px-5 py-8 md:px-8 md:py-12">
        {/* Heading */}
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#203a31] text-[#f4f0e6]">
            <SlidersHorizontal size={21} />
          </div>

          <p className="mt-6 text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
            TripWise preferences
          </p>

          <h1 className="mt-2 font-serif text-4xl tracking-[-.03em] md:text-5xl">
            Settings
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#77736a]">
            Customize how TripWise handles your trips,
            expenses, notifications and account
            preferences.
          </p>
        </div>

        {/* Messages */}
        {success && (
          <div className="mt-7 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 text-sm font-medium text-green-800">
            <Info size={18} />
            {success}
          </div>
        )}

        {error && (
          <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_330px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Profile shortcut */}
            <section className="rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.05)] md:p-7">
              <div className="flex items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e3e1d7] text-[#566055]">
                    {user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={20} />
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#927543]">
                      Your account
                    </p>

                    <h2 className="mt-1 font-serif text-2xl">
                      {user?.name || "Traveler"}
                    </h2>

                    <p className="mt-1 text-xs text-[#817d74]">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <Link
                  href="/profile"
                  className="hidden items-center gap-2 rounded-full border border-[#292a25]/15 bg-white px-4 py-2.5 text-xs font-bold transition hover:bg-[#ebe7dc] sm:inline-flex"
                >
                  Manage profile
                  <ChevronRight size={15} />
                </Link>
              </div>

              <p className="mt-5 text-xs leading-5 text-[#817d74]">
                Update your name, profile photo, email
                information and UPI details from your
                dedicated profile page.
              </p>

              <Link
                href="/profile"
                className="mt-5 flex items-center justify-between rounded-2xl border border-[#292a25]/10 bg-white px-4 py-3.5 text-sm font-bold transition hover:bg-[#ebe7dc] sm:hidden"
              >
                <span className="flex items-center gap-3">
                  <User size={17} />
                  Open profile
                </span>

                <ChevronRight size={17} />
              </Link>
            </section>

            {/* Notifications */}
            <section className="rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.05)] md:p-7">
              <SectionHeader
                icon={<Bell size={19} />}
                title="Notifications"
                description="Choose which trip updates you want to receive."
              />

              <div className="mt-6 divide-y divide-[#292a25]/10">
                <ToggleRow
                  icon={<MapPinned size={17} />}
                  title="Trip reminders"
                  description="Get reminders about upcoming trip dates."
                  checked={settings.tripReminders}
                  onChange={(value) =>
                    updateSetting(
                      "tripReminders",
                      value
                    )
                  }
                />

                <ToggleRow
                  icon={<ReceiptText size={17} />}
                  title="Expense updates"
                  description="Stay informed when group expenses are added."
                  checked={settings.expenseNotifications}
                  onChange={(value) =>
                    updateSetting(
                      "expenseNotifications",
                      value
                    )
                  }
                />

                <ToggleRow
                  icon={<WalletCards size={17} />}
                  title="Settlement updates"
                  description="Receive updates about balances and payments."
                  checked={
                    settings.settlementNotifications
                  }
                  onChange={(value) =>
                    updateSetting(
                      "settlementNotifications",
                      value
                    )
                  }
                />
              </div>
            </section>

            {/* Trip preferences */}
            <section className="rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.05)] md:p-7">
              <SectionHeader
                icon={<MapPinned size={19} />}
                title="Trip preferences"
                description="Set defaults for the way you plan and manage trips."
              />

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <SelectField
                  label="Default currency"
                  icon={<CreditCard size={17} />}
                  value={settings.currency}
                  onChange={(value) =>
                    updateSetting(
                      "currency",
                      value
                    )
                  }
                  options={[
                    {
                      value: "INR",
                      label: "Indian Rupee (₹)",
                    },
                    {
                      value: "USD",
                      label: "US Dollar ($)",
                    },
                    {
                      value: "EUR",
                      label: "Euro (€)",
                    },
                    {
                      value: "GBP",
                      label: "British Pound (£)",
                    },
                    {
                      value: "AED",
                      label: "UAE Dirham (د.إ)",
                    },
                    {
                      value: "SGD",
                      label: "Singapore Dollar (S$)",
                    },
                  ]}
                />

                <SelectField
                  label="Default split"
                  icon={<WalletCards size={17} />}
                  value={settings.defaultSplit}
                  onChange={(value) =>
                    updateSetting(
                      "defaultSplit",
                      value as
                        | "equal"
                        | "custom"
                    )
                  }
                  options={[
                    {
                      value: "equal",
                      label: "Split equally",
                    },
                    {
                      value: "custom",
                      label: "Choose manually",
                    },
                  ]}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-[#292a25]/10 bg-[#ebe7dc]/70 p-4">
                <div className="flex items-start gap-3">
                  <Info
                    size={17}
                    className="mt-0.5 shrink-0 text-[#927543]"
                  />

                  <p className="text-xs leading-5 text-[#77736a]">
                    These are your preferred defaults.
                    Individual trips and expenses can
                    still use different currencies or
                    split methods when needed.
                  </p>
                </div>
              </div>
            </section>

            {/* Smart features */}
            <section className="rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.05)] md:p-7">
              <SectionHeader
                icon={<ReceiptText size={19} />}
                title="Smart travel features"
                description="Control convenience features used while managing expenses."
              />

              <div className="mt-6">
                <ToggleRow
                  icon={<ReceiptText size={17} />}
                  title="Receipt scanning"
                  description="Allow the expense workflow to use receipt scanning and item extraction."
                  checked={settings.receiptScanning}
                  onChange={(value) =>
                    updateSetting(
                      "receiptScanning",
                      value
                    )
                  }
                />
              </div>
            </section>

            {/* Language / appearance */}
            <section className="rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.05)] md:p-7">
              <SectionHeader
                icon={<Globe2 size={19} />}
                title="Language & appearance"
                description="Choose how TripWise should look and communicate."
              />

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <SelectField
                  label="Language"
                  icon={<Languages size={17} />}
                  value={settings.language}
                  onChange={(value) =>
                    updateSetting(
                      "language",
                      value
                    )
                  }
                  options={[
                    {
                      value: "English",
                      label: "English",
                    },
                    {
                      value: "Hindi",
                      label: "Hindi",
                    },
                    {
                      value: "Marathi",
                      label: "Marathi",
                    },
                  ]}
                />

                <ToggleRow
                  icon={<Moon size={17} />}
                  title="Dark mode"
                  description="Use a darker interface when available."
                  checked={settings.darkMode}
                  onChange={(value) =>
                    updateSetting(
                      "darkMode",
                      value
                    )
                  }
                />
              </div>
            </section>

            {/* Save */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-[#191a18] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#2b302c] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <SlidersHorizontal size={16} />
                )}

                {saving
                  ? "Saving..."
                  : "Save preferences"}
              </button>
            </div>
          </div>

          {/* Right column */}
          <aside className="space-y-6">
            {/* Account summary */}
            <div className="rounded-[28px] bg-[#203a31] p-6 text-[#f3efe5] md:p-7">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-white/10 bg-[#486258] text-xl font-bold">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  (
                    user?.name?.charAt(0) ||
                    user?.email?.charAt(0) ||
                    "T"
                  ).toUpperCase()
                )}
              </div>

              <p className="mt-6 text-[10px] font-bold uppercase tracking-[.18em] text-[#c7d1c4]">
                Account settings
              </p>

              <h2 className="mt-2 font-serif text-2xl">
                {user?.name || "Traveler"}
              </h2>

              <p className="mt-1 break-all text-xs text-[#c5cec8]">
                {user?.email}
              </p>

              <Link
                href="/profile"
                className="mt-6 flex items-center justify-between rounded-xl border border-white/15 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
              >
                <span className="flex items-center gap-2">
                  <User size={16} />
                  View profile
                </span>

                <ChevronRight size={16} />
              </Link>
            </div>

            {/* Quick settings */}
            <div className="rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_15px_50px_rgba(40,40,30,.05)]">
              <p className="px-2 text-[10px] font-bold uppercase tracking-[.18em] text-[#927543]">
                Account
              </p>

              <div className="mt-3">
                <SettingsLink
                  href="/profile"
                  icon={<User size={17} />}
                  title="Profile"
                  description="Personal details and UPI"
                />

                <SettingsLink
                  href="/trips"
                  icon={<MapPinned size={17} />}
                  title="My trips"
                  description="Manage your group trips"
                />

                <SettingsLink
                  href="/dashboard"
                  icon={<WalletCards size={17} />}
                  title="Dashboard"
                  description="Return to your overview"
                />
              </div>
            </div>

            {/* Security */}
            <div className="rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_15px_50px_rgba(40,40,30,.05)]">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055]">
                  <ShieldCheck size={18} />
                </div>

                <div>
                  <h3 className="font-serif text-xl">
                    Security
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-[#817d74]">
                    Your login is managed through your
                    authenticated account provider.
                  </p>
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="rounded-[28px] border border-[#292a25]/10 bg-[#ebe7dc] p-5">
              <div className="flex items-start gap-3">
                <CircleHelp
                  size={19}
                  className="mt-0.5 shrink-0 text-[#566055]"
                />

                <div>
                  <h3 className="font-serif text-xl">
                    Need help?
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-[#77736a]">
                    Settings control your TripWise
                    preferences. Your personal information
                    stays on the Profile page.
                  </p>
                </div>
              </div>
            </div>

            {/* Sign out */}
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-[#f8f5ec] px-4 py-3.5 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <LogOut size={16} />
              )}

              {signingOut
                ? "Signing out..."
                : "Sign out"}
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                  */
/* -------------------------------------------------------------------------- */

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055]">
        {icon}
      </div>

      <div>
        <h2 className="font-serif text-2xl">
          {title}
        </h2>

        <p className="mt-1 text-xs leading-5 text-[#817d74]">
          {description}
        </p>
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  title,
  description,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-5 first:pt-0 last:pb-0">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ebe7dc] text-[#66685f]">
          {icon}
        </div>

        <div>
          <p className="text-sm font-bold text-[#292a25]">
            {title}
          </p>

          <p className="mt-1 max-w-xl text-xs leading-5 text-[#817d74]">
            {description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          checked
            ? "bg-[#355244]"
            : "bg-[#c8c5bb]"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked
              ? "left-6"
              : "left-1"
          }`}
        />
      </button>
    </div>
  );
}

function SelectField({
  label,
  icon,
  value,
  onChange,
  options,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
  }[];
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-bold text-[#68655d]">
        {label}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-[#9b968a]">
          {icon}
        </div>

        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="w-full appearance-none rounded-2xl border border-[#292a25]/15 bg-white px-11 py-3.5 pr-10 text-sm outline-none transition focus:border-[#355244] focus:ring-2 focus:ring-[#355244]/10"
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

        <ChevronRight
          size={16}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-[#9b968a]"
        />
      </div>
    </div>
  );
}

function SettingsLink({
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
      className="flex items-center gap-3 rounded-2xl px-2 py-3.5 transition hover:bg-[#ebe7dc]"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#ebe7dc] text-[#66685f]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          {title}
        </p>

        <p className="mt-0.5 truncate text-[11px] text-[#817d74]">
          {description}
        </p>
      </div>

      <ChevronRight
        size={16}
        className="shrink-0 text-[#99948a]"
      />
    </Link>
  );
}