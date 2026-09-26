"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { openGooglePayPayment } from "@/lib/upi";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";

type Balance = {
  memberId: string;
  name: string;
  email: string;
  upiId: string | null;
  paid: number;
  owed: number;
  net: number;
};

type Transfer = {
  from: string;
  fromId: string;
  to: string;
  toId: string;
  amount: number;
  fromUpiId: string | null;
  toUpiId: string | null;
};

type Payment = {
  id: string;
  trip_id: string;
  payer_id: string | null;
  receiver_id: string | null;
  amount: number;
  status: string | null;
  created_at: string;
  completed_at: string | null;
};

type SettlementData = {
  tripId: string;
  totalExpenses: number;
  totalPaid: number;
  outstanding: number;
  expenseCount: number;
  paymentCount: number;
  members: Balance[];
  transfers: Transfer[];
  payments: Payment[];
};

export default function SettlementPage() {
  const params =
    useParams<{
      tripId: string;
    }>();

  const tripId =
    params.tripId;

  const [data, setData] =
    useState<SettlementData | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [payingKey, setPayingKey] =
    useState("");

  const [error, setError] =
    useState("");

  const loadSettlement =
    useCallback(
      async (
        showRefresh = false
      ) => {
        try {
          if (showRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const response =
            await fetch(
              `/api/settlement?tripId=${encodeURIComponent(
                tripId
              )}`,
              {
                cache: "no-store",
              }
            );

          const result =
            await response.json();

          if (!response.ok) {
            throw new Error(
              result.error ||
                "Unable to load settlement."
            );
          }

          setData(result);
        } catch (err) {
          console.error(
            "Settlement loading error:",
            err
          );

          setError(
            err instanceof Error
              ? err.message
              : "Unable to load settlement."
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [tripId]
    );

  useEffect(() => {
    if (tripId) {
      loadSettlement();
    }
  }, [
    tripId,
    loadSettlement,
  ]);

  async function recordPayment(
    transfer: Transfer
  ) {
    const paymentKey =
      `${transfer.fromId}-${transfer.toId}`;

    try {
      setPayingKey(
        paymentKey
      );

      setError("");

      const response =
        await fetch(
          "/api/settlement",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              tripId,
              payerId:
                transfer.fromId,
              receiverId:
                transfer.toId,
              amount:
                transfer.amount,
            }),
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Unable to record payment."
        );
      }

      setData(
        result.settlement
      );
    } catch (err) {
      console.error(
        "Payment recording error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to record payment."
      );
    } finally {
      setPayingKey("");
    }
  }

  const totalPaid =
    data?.totalPaid ?? 0;

  const outstanding =
    data?.outstanding ?? 0;

  const completed =
    data?.paymentCount ?? 0;

  const hasData =
    Boolean(data);

  const fullySettled =
    hasData &&
    outstanding < 0.01;

  const positiveMembers =
    useMemo(
      () =>
        (data?.members ?? []).filter(
          (member) =>
            member.net > 0.009
        ),
      [data]
    );

  const negativeMembers =
    useMemo(
      () =>
        (data?.members ?? []).filter(
          (member) =>
            member.net < -0.009
        ),
      [data]
    );

  if (loading) {
    return (
      <SettlementShell
        tripId={tripId}
      >
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <Loader2
              size={32}
              className="mx-auto animate-spin text-[#355244]"
            />

            <p className="mt-4 font-serif text-2xl">
              Calculating settlement...
            </p>

            <p className="mt-2 text-sm text-[#817d74]">
              Reading expenses, splits and payments.
            </p>
          </div>
        </div>
      </SettlementShell>
    );
  }

  return (
    <SettlementShell
      tripId={tripId}
    >
      {/* ============================================================= */}
      {/* HEADER                                                        */}
      {/* ============================================================= */}

      <div className="mb-9">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
          <span className="h-px w-7 bg-[#b8a476]" />

          Trip ledger

          <span className="text-[#aaa59a]">
            /
          </span>

          Settlement
        </div>

        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="font-serif text-[48px] leading-none tracking-[-.04em] md:text-[64px]">
              Settlement
            </h1>

            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#68655d]">
              Real balances calculated from this trip's
              database expenses, participant splits and
              completed payments.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              loadSettlement(true)
            }
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-[#292a25]/15 bg-[#f8f5ec] px-4 py-2.5 text-sm font-bold transition hover:bg-white disabled:opacity-50 lg:self-auto"
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
      </div>

      {/* ============================================================= */}
      {/* ERROR                                                         */}
      {/* ============================================================= */}

      {error && (
        <div className="mb-6 rounded-[24px] border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-800">
            Settlement error
          </p>

          <p className="mt-1 text-sm text-red-700">
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              loadSettlement()
            }
            className="mt-4 rounded-full bg-red-800 px-4 py-2 text-xs font-bold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {/* ============================================================= */}
      {/* SUMMARY                                                       */}
      {/* ============================================================= */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={
            <WalletCards
              size={18}
            />
          }
          label="Trip expenses"
          value={formatMoney(
            data?.totalExpenses ??
              0
          )}
          description={`${data?.expenseCount ?? 0} recorded expenses`}
        />

        <SummaryCard
          icon={
            <CreditCard
              size={18}
            />
          }
          label="Paid back"
          value={formatMoney(
            totalPaid
          )}
          description={`${completed} completed payments`}
        />

        <SummaryCard
          icon={
            <ArrowRight
              size={18}
            />
          }
          label="Still outstanding"
          value={formatMoney(
            outstanding
          )}
          description={
            fullySettled
              ? "Everything is settled"
              : "Amount remaining to settle"
          }
        />

        <SummaryCard
          icon={
            <UserRound
              size={18}
            />
          }
          label="Participants"
          value={String(
            data?.members
              ?.length ?? 0
          )}
          description="People in this trip"
        />
      </div>

      {/* ============================================================= */}
      {/* STATUS BANNER                                                  */}
      {/* ============================================================= */}

      <div
        className={`mt-6 rounded-[28px] border p-6 ${
          fullySettled
            ? "border-[#b8cbbb] bg-[#e5eee5]"
            : "border-[#d8cfb6] bg-[#eee9db]"
        }`}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                fullySettled
                  ? "bg-[#355244] text-white"
                  : "bg-[#ded5bd] text-[#5e573f]"
              }`}
            >
              {fullySettled ? (
                <CheckCircle2
                  size={20}
                />
              ) : (
                <Sparkles
                  size={20}
                />
              )}
            </div>

            <div>
              <p className="font-bold">
                {fullySettled
                  ? "Trip fully settled"
                  : "Settlement is up to date"}
              </p>

              <p className="mt-1 text-sm leading-6 text-[#68655d]">
                {fullySettled
                  ? "There are no outstanding transfers between participants."
                  : `${data?.transfers.length ?? 0} payment${
                      (data?.transfers.length ??
                        0) === 1
                        ? ""
                        : "s"
                    } currently need to be completed.`}
              </p>
            </div>
          </div>

          {!fullySettled && (
            <p className="font-serif text-2xl font-bold">
              {formatMoney(
                outstanding
              )}
            </p>
          )}
        </div>
      </div>

      {/* ============================================================= */}
      {/* WHO OWES WHOM                                                  */}
      {/* ============================================================= */}

      <section className="mt-8 rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.05)] md:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
              Recommended transfers
            </p>

            <h2 className="mt-2 font-serif text-3xl">
              Who pays whom
            </h2>

            <p className="mt-2 text-sm text-[#817d74]">
              Transfers are minimized automatically from
              the real database balances.
            </p>
          </div>

          {!fullySettled && (
            <span className="rounded-full bg-[#e8e5d9] px-3 py-1.5 text-xs font-bold text-[#68655d]">
              {data?.transfers.length ?? 0} transfers
            </span>
          )}
        </div>

        <div className="mt-6">
          {fullySettled ? (
            <div className="rounded-[24px] border border-dashed border-[#aebdab] bg-[#edf3eb] px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#355244] text-white">
                <Check size={25} />
              </div>

              <h3 className="mt-5 font-serif text-2xl">
                Nothing left to pay
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#68655d]">
                Every participant's calculated balance
                is currently settled.
              </p>
            </div>
          ) : data?.transfers.length ? (
            <div className="space-y-3">
              {data.transfers.map(
                (transfer) => {
                  const key =
                    `${transfer.fromId}-${transfer.toId}`;

                  const paying =
                    payingKey ===
                    key;

                  return (
                    <TransferCard
                      key={key}
                      transfer={
                        transfer
                      }
                      paying={paying}
                      onPay={() =>
                        recordPayment(
                          transfer
                        )
                      }
                    />
                  );
                }
              )}
            </div>
          ) : (
            <EmptyState
              title="No settlement transfers"
              description="There are no calculated outstanding balances for this trip."
            />
          )}
        </div>
      </section>

      {/* ============================================================= */}
      {/* BALANCES                                                       */}
      {/* ============================================================= */}

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* PEOPLE OWED */}
        <BalanceSection
          title="People receiving"
          description="These participants have paid more than their calculated share."
          people={
            positiveMembers
          }
          positive
        />

        {/* PEOPLE OWING */}
        <BalanceSection
          title="People owing"
          description="These participants still need to contribute their share."
          people={
            negativeMembers
          }
        />
      </section>

      {/* ============================================================= */}
      {/* PAYMENT HISTORY                                                */}
      {/* ============================================================= */}

      <section className="mt-8 rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.04)] md:p-7">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
            Payment history
          </p>

          <h2 className="mt-2 font-serif text-3xl">
            Recorded payments
          </h2>

          <p className="mt-2 text-sm text-[#817d74]">
            Payments stored in your Supabase database.
          </p>
        </div>

        <div className="mt-6">
          {data?.payments.length ? (
            <div className="space-y-2">
              {data.payments.map(
                (payment) => {
                  const payer =
                    data.members.find(
                      (member) =>
                        member.memberId ===
                        payment.payer_id
                    );

                  const receiver =
                    data.members.find(
                      (member) =>
                        member.memberId ===
                        payment.receiver_id
                    );

                  return (
                    <div
                      key={
                        payment.id
                      }
                      className="flex flex-col gap-4 rounded-2xl border border-[#292a25]/8 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e5eee5] text-[#355244]">
                          <CheckCircle2
                            size={17}
                          />
                        </div>

                        <div>
                          <p className="text-sm font-bold">
                            {payer?.name ||
                              "Traveler"}{" "}
                            paid{" "}
                            {receiver?.name ||
                              "Traveler"}
                          </p>

                          <p className="mt-1 text-xs text-[#8b877d]">
                            {formatDate(
                              payment.completed_at ||
                                payment.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      <p className="font-serif text-xl font-bold">
                        {formatMoney(
                          payment.amount
                        )}
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <EmptyState
              title="No payments recorded"
              description="Completed settlement payments will appear here."
            />
          )}
        </div>
      </section>

      {/* ============================================================= */}
      {/* HOW CALCULATION WORKS                                          */}
      {/* ============================================================= */}

      <section className="mt-8 rounded-[30px] border border-[#292a25]/10 bg-[#e8e3d5] p-6 md:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f8f5ec] text-[#355244]">
            <Sparkles size={19} />
          </div>

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
              Calculation logic
            </p>

            <h2 className="mt-2 font-serif text-2xl">
              Transparent settlement
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-7 text-[#68655d]">
              For every participant, TripWise calculates
              the amount they paid minus the amount they
              owe from the expense splits. Positive
              balances are amounts to receive; negative
              balances are amounts to pay. Completed
              payments are then applied and the remaining
              balances are converted into a minimized set
              of transfers.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================= */}
      {/* BACK                                                          */}
      {/* ============================================================= */}

      <div className="mt-9">
        <Link
          href={`/trip/${tripId}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#355244] hover:underline"
        >
          <ArrowLeft size={15} />

          Back to trip
        </Link>
      </div>
    </SettlementShell>
  );
}

/* ======================================================================= */
/* SHELL                                                                    */
/* ======================================================================= */

function SettlementShell({
  tripId,
  children,
}: {
  tripId: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f4f0e6] text-[#191917]">
      <div
        className="min-h-screen"
        style={{
          backgroundImage:
            "linear-gradient(rgba(31,39,34,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(31,39,34,.045) 1px, transparent 1px)",
          backgroundSize:
            "46px 46px",
        }}
      >
        <header className="sticky top-0 z-50 border-b border-[#292a25]/10 bg-[#f4f0e6]/95 backdrop-blur-xl">
          <div className="mx-auto flex h-[82px] max-w-[1450px] items-center justify-between px-5 md:px-8">
            <Link
              href={`/trip/${tripId}`}
              className="flex items-center gap-3"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#191a18] font-serif text-lg font-bold text-[#f4f0e6]">
                T
              </span>

              <span className="hidden sm:block">
                <b className="font-serif text-xl">
                  TripWise
                </b>

                <small className="block text-[9px] font-bold uppercase tracking-[.2em] text-[#927543]">
                  Group travel
                </small>
              </span>
            </Link>

            <Link
              href={`/trip/${tripId}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#292a25]/15 bg-[#f8f5ec] px-4 py-2.5 text-sm font-bold transition hover:bg-white"
            >
              <ArrowLeft size={15} />

              <span className="hidden sm:inline">
                Trip overview
              </span>

              <span className="sm:hidden">
                Back
              </span>
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-[1250px] px-5 py-9 md:px-8 md:py-12">
          {children}
        </section>
      </div>
    </main>
  );
}

/* ======================================================================= */
/* SUMMARY CARD                                                            */
/* ======================================================================= */

function SummaryCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_10px_35px_rgba(40,40,30,.035)]">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055]">
        {icon}
      </div>

      <p className="mt-4 text-[10px] font-bold uppercase tracking-[.14em] text-[#8b877d]">
        {label}
      </p>

      <p className="mt-1 font-serif text-2xl">
        {value}
      </p>

      <p className="mt-1 text-xs text-[#8b877d]">
        {description}
      </p>
    </div>
  );
}

/* ======================================================================= */
/* TRANSFER CARD                                                           */
/* ======================================================================= */

function TransferCard({
  transfer,
  paying,
  onPay,
}: {
  transfer: Transfer;
  paying: boolean;
  onPay: () => void;
}) {
  const canPayWithUpi = Boolean(
    transfer.toUpiId?.trim()
  );

  function handleUpiPayment() {
    if (!transfer.toUpiId) {
      return;
    }

    openGooglePayPayment({
      payeeUpiId: transfer.toUpiId,
      payeeName: transfer.to,
      amount: transfer.amount,
    });
  }

  return (
    <div className="rounded-[24px] border border-[#292a25]/8 bg-white p-4 md:p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f0e9d8] text-[#6c5d38]">
            <UserRound size={18} />
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {transfer.from}
            </p>

            <p className="mt-1 text-xs text-[#8b877d]">
              Needs to pay
            </p>
          </div>

          <ArrowRight
            size={18}
            className="shrink-0 text-[#aaa59a]"
          />

          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {transfer.to}
            </p>

            <p className="mt-1 text-xs text-[#8b877d]">
              Receives
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <p className="font-serif text-2xl font-bold">
            {formatMoney(
              transfer.amount
            )}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleUpiPayment}
              disabled={!canPayWithUpi || paying}
              title={
                canPayWithUpi
                  ? "Open Google Pay with the receiver and amount filled in"
                  : "Receiver has not added a UPI ID"
              }
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#355244]/25 bg-[#edf3eb] px-5 py-3 text-sm font-bold text-[#355244] transition hover:-translate-y-0.5 hover:bg-[#e3eee1] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <UpiIcon size={16} />

              Pay using UPI
            </button>

            <button
              type="button"
              onClick={onPay}
              disabled={paying}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#2b302c] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paying ? (
                <>
                  <Loader2
                    size={15}
                    className="animate-spin"
                  />

                  Saving...
                </>
              ) : (
                <>
                  <Check size={15} />

                  Mark as paid
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {transfer.toUpiId && (
        <div className="mt-4 border-t border-[#292a25]/8 pt-4 text-xs text-[#817d74]">
          <span>
            Receiver UPI:{" "}
            <b>
              {transfer.toUpiId}
            </b>
          </span>
        </div>
      )}
    </div>
  );
}

function UpiIcon({
  size = 16,
}: {
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-[4px] border border-current px-[2px] py-[1px] text-[8px] font-black leading-none tracking-[-.04em]"
      style={{
        width: size,
        height: size,
      }}
    >
      UPI
    </span>
  );
}

/* ======================================================================= */
/* BALANCE SECTION                                                         */
/* ======================================================================= */

function BalanceSection({
  title,
  description,
  people,
  positive = false,
}: {
  title: string;
  description: string;
  people: Balance[];
  positive?: boolean;
}) {
  return (
    <section className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 shadow-[0_15px_50px_rgba(40,40,30,.04)]">
      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
        Balance
      </p>

      <h2 className="mt-2 font-serif text-2xl">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-[#817d74]">
        {description}
      </p>

      <div className="mt-5 space-y-2">
        {people.length ? (
          people.map(
            (person) => (
              <div
                key={
                  person.memberId
                }
                className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8e5d9] text-[#566055]">
                    <UserRound
                      size={16}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">
                      {person.name}
                    </p>

                    <p className="mt-1 truncate text-xs text-[#8b877d]">
                      {person.email ||
                        "Trip participant"}
                    </p>
                  </div>
                </div>

                <p
                  className={`shrink-0 font-serif text-xl font-bold ${
                    positive
                      ? "text-[#355244]"
                      : "text-[#9a5b52]"
                  }`}
                >
                  {positive
                    ? "+"
                    : "-"}
                  {formatMoney(
                    Math.abs(
                      person.net
                    )
                  )}
                </p>
              </div>
            )
          )
        ) : (
          <p className="rounded-2xl bg-[#f4f0e6] px-4 py-8 text-center text-sm text-[#8b877d]">
            No people in this balance group.
          </p>
        )}
      </div>
    </section>
  );
}

/* ======================================================================= */
/* EMPTY STATE                                                             */
/* ======================================================================= */

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#292a25]/15 bg-[#f4f0e6] px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#566055]">
        <WalletCards
          size={23}
        />
      </div>

      <h3 className="mt-4 font-serif text-xl">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#817d74]">
        {description}
      </p>
    </div>
  );
}

/* ======================================================================= */
/* HELPERS                                                                 */
/* ======================================================================= */

function formatMoney(
  value: number
) {
  return `₹${Number(
    value || 0
  ).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(
  value: string
) {
  if (!value) {
    return "";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}