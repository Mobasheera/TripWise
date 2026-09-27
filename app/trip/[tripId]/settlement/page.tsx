"use client";

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Download,
  FileText,
  Hotel,
  Lock,
  MapPin,
  Receipt,
  RefreshCw,
  Route,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  getSupabase,
} from "@/lib/supabase";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ========================================================================== */
/* TYPES                                                                      */
/* ========================================================================== */

type Trip = {
  id: string;
  name: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  created_by: string | null;
  created_at: string;
  status?: "active" | "completed" | null;
  completed_at?: string | null;
  completed_by?: string | null;
};

type Profile = {
  id?: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  upi_id?: string | null;
};

type Member = {
  id: string;
  trip_id: string;
  user_id: string;
  role: string | null;
  profile?: Profile | null;
  profiles?: Profile | Profile[] | null;
};

type Expense = {
  id: string;
  trip_id: string;
  title: string;
  amount: number | string;
  paid_by: string | null;
  category: string | null;
  expense_date: string | null;
  created_at: string;
};

type ExpenseSplit = {
  id: string;
  expense_id: string;
  participant_id: string;
  split_type: string;
  amount: number | string;
};

type Booking = {
  id: string;
  trip_id: string;
  title: string;
  type: string | null;
  vendor: string | null;
  amount: number | string | null;
  paid_by: string | null;
  booking_date: string | null;
  status: string | null;
};

type Payment = {
  id: string;
  trip_id: string;
  payer_id: string | null;
  receiver_id: string | null;
  amount: number | string;
  status: string | null;
  created_at: string;
  completed_at: string | null;
};

type Balance = {
  userId: string;
  name: string;
  email: string;
  paid: number;
  owed: number;
  net: number;
  upiId?: string | null;
};

type Transfer = {
  // `from` / `to` are the exact traveler display names returned by the API.
  from: string;
  to: string;
  // `fromId` / `toId` are the Supabase auth user UUIDs used for payment writes.
  fromId: string;
  toId: string;
  fromName?: string;
  toName?: string;
  fromUpiId?: string | null;
  toUpiId?: string | null;
  amount: number;
};

type SettlementResponse = {
  balances?: Balance[];
  transfers?: Transfer[];
};

/* ========================================================================== */
/* MAIN PAGE                                                                  */
/* ========================================================================== */

export default function SettlementPage() {
  const params = useParams<{ tripId: string }>();
  const router = useRouter();

  const tripId = String(params?.tripId || "");

  const supabase = useMemo(
    () => getSupabase(),
    []
  );

  const [trip, setTrip] =
    useState<Trip | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [splits, setSplits] =
    useState<ExpenseSplit[]>([]);

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [payments, setPayments] =
    useState<Payment[]>([]);

  const [settlement, setSettlement] =
    useState<SettlementResponse>({
      balances: [],
      transfers: [],
    });

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [activeTab, setActiveTab] =
    useState<
      "overview" |
      "splits" |
      "transactions" |
      "settlements"
    >("overview");

  const [expandedExpense, setExpandedExpense] =
    useState<string | null>(null);

  const [payingTransfer, setPayingTransfer] =
    useState<string | null>(null);

  const [showEndTrip, setShowEndTrip] =
    useState(false);

  const [endingTrip, setEndingTrip] =
    useState(false);

  const [generatingPdf, setGeneratingPdf] =
    useState(false);

  /* ======================================================================== */
  /* LOAD DATA                                                                */
  /* ======================================================================== */

  const loadSettlement = useCallback(
    async (refresh = false) => {
      if (!tripId) return;

      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const currentUser =
          await getCurrentUser();

        if (!currentUser) {
          router.push("/login");
          return;
        }

        /* ------------------------------------------------------------------ */
        /* TRIP                                                                */
        /* ------------------------------------------------------------------ */

        const tripResult =
          await supabase
            .from("trips")
            .select(
              `
                id,
                name,
                destination,
                start_date,
                end_date,
                created_by,
                created_at,
                status,
                completed_at,
                completed_by
              `
            )
            .eq("id", tripId)
            .maybeSingle();

        if (tripResult.error) {
          throw tripResult.error;
        }

        if (!tripResult.data) {
          setTrip(null);
          setError("Trip not found.");
          return;
        }

        setTrip(
          tripResult.data as Trip
        );

        /* ------------------------------------------------------------------ */
        /* MEMBERS                                                             */
        /* ------------------------------------------------------------------ */

        const memberResult =
          await supabase
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
                  avatar_url,
                  upi_id
                )
              `
            )
            .eq("trip_id", tripId);

        if (memberResult.error) {
          throw memberResult.error;
        }

        const loadedMembers =
          (memberResult.data || []) as unknown as Member[];

        // Legacy protection: the trip creator is always participant #1.
        const creatorId = tripResult.data.created_by;
        if (creatorId && !loadedMembers.some((member) => member.user_id === creatorId)) {
          const { data: creatorProfile, error: creatorProfileError } =
            await supabase
              .from("profiles")
              .select("id, name, email, avatar_url, upi_id")
              .eq("id", creatorId)
              .maybeSingle();

          if (creatorProfileError) {
            throw creatorProfileError;
          }

          loadedMembers.unshift({
            id: `legacy-owner-${tripId}`,
            trip_id: tripId,
            user_id: creatorId,
            role: "organizer",
            profile: creatorProfile || { id: creatorId },
          });
        }

        setMembers(loadedMembers);

        /* ------------------------------------------------------------------ */
        /* EXPENSES                                                            */
        /* ------------------------------------------------------------------ */

        const expenseResult =
          await supabase
            .from("expenses")
            .select(
              `
                id,
                trip_id,
                title,
                amount,
                paid_by,
                category,
                expense_date,
                created_at
              `
            )
            .eq("trip_id", tripId)
            .order("created_at", {
              ascending: false,
            });

        if (expenseResult.error) {
          throw expenseResult.error;
        }

        const loadedExpenses =
          (expenseResult.data ||
            []) as Expense[];

        setExpenses(
          loadedExpenses
        );

        /* ------------------------------------------------------------------ */
        /* MULTI SPLITS                                                        */
        /* ------------------------------------------------------------------ */

        if (loadedExpenses.length) {
          const expenseIds =
            loadedExpenses.map(
              (expense) => expense.id
            );

          const splitResult =
            await supabase
              .from("expense_splits")
              .select(
                `
                  id,
                  expense_id,
                  participant_id,
                  split_type,
                  amount
                `
              )
              .in(
                "expense_id",
                expenseIds
              );

          if (splitResult.error) {
            throw splitResult.error;
          }

          setSplits(
            (splitResult.data ||
              []) as ExpenseSplit[]
          );
        } else {
          setSplits([]);
        }

        /* ------------------------------------------------------------------ */
        /* BOOKINGS                                                            */
        /* ------------------------------------------------------------------ */

        const bookingResult =
          await supabase
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
            });

        if (bookingResult.error) {
          throw bookingResult.error;
        }

        setBookings(
          (bookingResult.data ||
            []) as Booking[]
        );

        /* ------------------------------------------------------------------ */
        /* PAYMENTS                                                            */
        /* ------------------------------------------------------------------ */

        const paymentResult =
          await supabase
            .from("payments")
            .select(
              `
                id,
                trip_id,
                payer_id,
                receiver_id,
                amount,
                status,
                created_at,
                completed_at
              `
            )
            .eq("trip_id", tripId)
            .order("created_at", {
              ascending: false,
            });

        if (paymentResult.error) {
          throw paymentResult.error;
        }

        setPayments(
          (paymentResult.data ||
            []) as Payment[]
        );

        /* ------------------------------------------------------------------ */
        /* SETTLEMENT API                                                      */
        /* ------------------------------------------------------------------ */

        const settlementResult =
          await fetch(
            `/api/settlement?tripId=${encodeURIComponent(
              tripId
            )}`,
            {
              cache: "no-store",
            }
          );

        if (!settlementResult.ok) {
          const message =
            await settlementResult.text();

          throw new Error(
            message ||
              "Unable to calculate settlement."
          );
        }

        const settlementData =
          (await settlementResult.json()) as SettlementResponse;

        setSettlement(
          settlementData
        );
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
    [router, supabase, tripId]
  );

  useEffect(() => {
    loadSettlement();
  }, [loadSettlement]);

  /* ======================================================================== */
  /* DERIVED DATA                                                             */
  /* ======================================================================== */

  const balances =
    settlement.balances || [];

  const transfers =
    settlement.transfers || [];

  const completed =
    trip?.status === "completed";

  const totalExpenses =
    expenses.reduce(
      (sum, expense) =>
        sum +
        Number(
          expense.amount || 0
        ),
      0
    );

  const totalBookings =
    bookings.reduce(
      (sum, booking) =>
        sum +
        Number(
          booking.amount || 0
        ),
      0
    );

  const totalTripSpend =
    totalExpenses +
    totalBookings;

  const totalPaidBack =
    payments
      .filter(
        (payment) =>
          payment.status ===
          "completed"
      )
      .reduce(
        (sum, payment) =>
          sum +
          Number(
            payment.amount || 0
          ),
        0
      );

  const totalOwed =
    balances.reduce(
      (sum, balance) =>
        sum +
        Math.max(
          0,
          Number(balance.owed || 0)
        ),
      0
    );

  const splitCount =
    splits.length;

  const splitModes =
    useMemo(() => {
      const counts: Record<
        string,
        number
      > = {};

      for (const split of splits) {
        const mode =
          normalizeSplitType(
            split.split_type
          );

        counts[mode] =
          (counts[mode] || 0) + 1;
      }

      return counts;
    }, [splits]);

  const transactionRows =
    useMemo(() => {
      const rows: Array<{
        id: string;
        type: "expense" | "booking" | "payment";
        title: string;
        amount: number;
        payer: string;
        date: string;
        detail: string;
      }> = [];

      for (const expense of expenses) {
        rows.push({
          id: `expense-${expense.id}`,
          type: "expense",
          title: expense.title,
          amount: Number(
            expense.amount || 0
          ),
          payer: getMemberName(
            members,
            expense.paid_by
          ),
          date:
            expense.expense_date ||
            expense.created_at,
          detail:
            expense.category ||
            "Trip expense",
        });
      }

      for (const booking of bookings) {
        rows.push({
          id: `booking-${booking.id}`,
          type: "booking",
          title: booking.title,
          amount: Number(
            booking.amount || 0
          ),
          payer: getMemberName(
            members,
            booking.paid_by
          ),
          date:
            booking.booking_date ||
            "",
          detail:
            booking.vendor ||
            booking.type ||
            "Booking",
        });
      }

      for (const payment of payments) {
        rows.push({
          id: `payment-${payment.id}`,
          type: "payment",
          title:
            "Settlement payment",
          amount: Number(
            payment.amount || 0
          ),
          payer: getMemberName(
            members,
            payment.payer_id
          ),
          date:
            payment.completed_at ||
            payment.created_at,
          detail: `Paid to ${getMemberName(
            members,
            payment.receiver_id
          )}`,
        });
      }

      return rows.sort(
        (a, b) =>
          new Date(b.date).getTime() -
          new Date(a.date).getTime()
      );
    }, [
      expenses,
      bookings,
      payments,
      members,
    ]);

  /* ======================================================================== */
  /* PAYMENT                                                                  */
  /* ======================================================================== */

  async function markTransferPaid(
    transfer: Transfer
  ) {
    if (completed) return;

    const key =
      `${transfer.fromId}-${transfer.toId}-${transfer.amount}`;

    try {
      setPayingTransfer(key);
      setError("");

      const result =
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

      const data =
        await result.json();

      if (!result.ok) {
        throw new Error(
          data?.error ||
            "Unable to record payment."
        );
      }

      await loadSettlement(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to record payment."
      );
    } finally {
      setPayingTransfer(null);
    }
  }

  /* ======================================================================== */
  /* END TRIP                                                                 */
  /* ======================================================================== */

  async function endTrip() {
    if (!trip) return;

    try {
      setEndingTrip(true);
      setError("");

      const currentUser =
        await getCurrentUser();

      if (!currentUser) {
        router.push("/login");
        return;
      }

      if (
        trip.created_by !==
        currentUser.id
      ) {
        throw new Error(
          "Only the trip creator can end this trip."
        );
      }

      if (transfers.length > 0) {
        throw new Error(
          "This trip still has outstanding settlements. Complete the remaining payments before ending the trip."
        );
      }

      const { error } =
        await supabase
          .from("trips")
          .update({
            status: "completed",
            completed_at:
              new Date().toISOString(),
            completed_by:
              currentUser.id,
          })
          .eq("id", trip.id)
          .eq(
            "created_by",
            currentUser.id
          );

      if (error) {
        throw error;
      }

      setShowEndTrip(false);

      await loadSettlement(true);
    } catch (err) {
      console.error(
        "End trip error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to end this trip."
      );
    } finally {
      setEndingTrip(false);
    }
  }

  /* ======================================================================== */
  /* PDF                                                                      */
  /* ======================================================================== */

  async function generatePdf() {
    if (!trip) return;

    try {
      setGeneratingPdf(true);

      const doc =
        new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

      const pageWidth =
        doc.internal.pageSize.getWidth();

      const pageHeight =
        doc.internal.pageSize.getHeight();

      /* -------------------------------------------------------------------- */
      /* COVER                                                                 */
      /* -------------------------------------------------------------------- */

      doc.setFillColor(
        28,
        39,
        33
      );

      doc.rect(
        0,
        0,
        pageWidth,
        70,
        "F"
      );

      doc.setTextColor(
        244,
        240,
        230
      );

      doc.setFontSize(11);
      doc.text(
        "TRIPWISE",
        18,
        20
      );

      doc.setFontSize(28);
      doc.text(
        "Trip Settlement Report",
        18,
        36
      );

      doc.setFontSize(12);
      doc.text(
        trip.name,
        18,
        48
      );

      doc.setFontSize(9);

      doc.text(
        `${trip.destination || "Group journey"} • ${
          formatDateRange(
            trip.start_date,
            trip.end_date
          )
        }`,
        18,
        58
      );

      doc.setTextColor(
        30,
        30,
        28
      );

      let y = 82;

      doc.setFontSize(17);
      doc.text(
        "Financial summary",
        18,
        y
      );

      y += 9;

      autoTable(doc, {
        startY: y,
        head: [
          [
            "Metric",
            "Amount",
          ],
        ],
        body: [
          [
            "Total trip spend",
            formatMoney(
              totalTripSpend
            ),
          ],
          [
            "Expenses",
            formatMoney(
              totalExpenses
            ),
          ],
          [
            "Bookings",
            formatMoney(
              totalBookings
            ),
          ],
          [
            "Settlement payments",
            formatMoney(
              totalPaidBack
            ),
          ],
          [
            "Participants",
            String(
              members.length
            ),
          ],
        ],
        theme: "grid",
        styles: {
          fontSize: 9,
        },
        headStyles: {
          fillColor: [
            28,
            39,
            33,
          ],
        },
      });

      /* -------------------------------------------------------------------- */
      /* PARTICIPANT BALANCES                                                  */
      /* -------------------------------------------------------------------- */

      y =
        (
          doc as any
        ).lastAutoTable.finalY +
        15;

      doc.setFontSize(17);
      doc.text(
        "Participant balances",
        18,
        y
      );

      y += 8;

      autoTable(doc, {
        startY: y,
        head: [
          [
            "Participant",
            "Paid",
            "Share",
            "Net",
          ],
        ],
        body: balances.map(
          (balance) => [
            balance.name,
            formatMoney(
              balance.paid
            ),
            formatMoney(
              balance.owed
            ),
            formatMoney(
              balance.net
            ),
          ]
        ),
        theme: "grid",
        styles: {
          fontSize: 8,
        },
        headStyles: {
          fillColor: [
            28,
            39,
            33,
          ],
        },
      });

      /* -------------------------------------------------------------------- */
      /* MULTI SPLITS                                                          */
      /* -------------------------------------------------------------------- */

      doc.addPage();

      y = 20;

      doc.setFontSize(18);
      doc.text(
        "Multi-split expense detail",
        18,
        y
      );

      y += 8;

      doc.setFontSize(9);
      doc.text(
        "Each row shows the exact participant allocation stored for the expense.",
        18,
        y
      );

      y += 6;

      for (
        const expense of expenses
      ) {
        const expenseSplits =
          splits.filter(
            (split) =>
              split.expense_id ===
              expense.id
          );

        if (!expenseSplits.length) {
          continue;
        }

        if (y > 250) {
          doc.addPage();
          y = 20;
        }

        doc.setFontSize(12);
        doc.text(
          `${expense.title} — ${formatMoney(
            Number(
              expense.amount
            )
          )}`,
          18,
          y
        );

        y += 5;

        doc.setFontSize(8);

        doc.text(
          `Paid by ${getMemberName(
            members,
            expense.paid_by
          )} • ${
            normalizeSplitType(
              expenseSplits[0]
                ?.split_type
            )
          } split`,
          18,
          y
        );

        y += 4;

        autoTable(doc, {
          startY: y,
          head: [
            [
              "Participant",
              "Split type",
              "Amount",
            ],
          ],
          body:
            expenseSplits.map(
              (split) => [
                getMemberName(
                  members,
                  split.participant_id
                ),
                normalizeSplitType(
                  split.split_type
                ),
                formatMoney(
                  Number(
                    split.amount
                  )
                ),
              ]
            ),
          theme: "grid",
          styles: {
            fontSize: 7.5,
          },
          headStyles: {
            fillColor: [
              80,
              93,
              82,
            ],
          },
        });

        y =
          (
            doc as any
          ).lastAutoTable.finalY +
          9;
      }

      /* -------------------------------------------------------------------- */
      /* TRANSACTION LEDGER                                                    */
      /* -------------------------------------------------------------------- */

      doc.addPage();

      y = 20;

      doc.setFontSize(18);
      doc.text(
        "Complete trip transaction ledger",
        18,
        y
      );

      y += 8;

      autoTable(doc, {
        startY: y,
        head: [
          [
            "Type",
            "Transaction",
            "Paid by",
            "Detail",
            "Amount",
          ],
        ],
        body:
          transactionRows.map(
            (row) => [
              row.type,
              row.title,
              row.payer,
              row.detail,
              formatMoney(
                row.amount
              ),
            ]
          ),
        theme: "grid",
        styles: {
          fontSize: 7,
        },
        headStyles: {
          fillColor: [
            28,
            39,
            33,
          ],
        },
      });

      /* -------------------------------------------------------------------- */
      /* SETTLEMENT TRANSFERS                                                  */
      /* -------------------------------------------------------------------- */

      y =
        (
          doc as any
        ).lastAutoTable.finalY +
        15;

      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(18);
      doc.text(
        "Settlement transfers",
        18,
        y
      );

      y += 8;

      if (transfers.length) {
        autoTable(doc, {
          startY: y,
          head: [
            [
              "From",
              "To",
              "Amount",
            ],
          ],
          body:
            transfers.map(
              (transfer) => [
                transfer.fromName ||
                  transfer.from ||
                  getMemberName(
                    members,
                    transfer.fromId
                  ),
                transfer.toName ||
                  transfer.to ||
                  getMemberName(
                    members,
                    transfer.toId
                  ),
                formatMoney(
                  transfer.amount
                ),
              ]
            ),
          theme: "grid",
          styles: {
            fontSize: 8,
          },
          headStyles: {
            fillColor: [
              28,
              39,
              33,
            ],
          },
        });
      } else {
        doc.setFontSize(10);
        doc.text(
          "No outstanding settlement transfers.",
          18,
          y
        );
      }

      /* -------------------------------------------------------------------- */
      /* FOOTER                                                               */
      /* -------------------------------------------------------------------- */

      const totalPages =
        (
          doc as any
        ).internal.getNumberOfPages();

      for (
        let page = 1;
        page <= totalPages;
        page++
      ) {
        doc.setPage(page);

        doc.setFontSize(7);
        doc.setTextColor(
          120,
          116,
          106
        );

        doc.text(
          `TripWise • ${trip.name}`,
          18,
          pageHeight - 10
        );

        doc.text(
          `Page ${page} of ${totalPages}`,
          pageWidth - 42,
          pageHeight - 10
        );
      }

      const safeName =
        trip.name
          .replace(
            /[^a-z0-9]+/gi,
            "-"
          )
          .replace(
            /^-+|-+$/g,
            ""
          )
          .toLowerCase();

      doc.save(
        `${safeName || "trip"}-settlement-report.pdf`
      );
    } catch (err) {
      console.error(
        "PDF generation error:",
        err
      );

      setError(
        "Unable to generate the PDF report."
      );
    } finally {
      setGeneratingPdf(false);
    }
  }

  /* ======================================================================== */
  /* LOADING                                                                  */
  /* ======================================================================== */

  if (loading) {
    return (
      <TripShell tripId={tripId}>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#191a18] text-[#f4f0e6]">
              <RefreshCw
                size={23}
                className="animate-spin"
              />
            </div>

            <h1 className="mt-6 font-serif text-3xl">
              Calculating settlement...
            </h1>

            <p className="mt-2 text-sm text-[#817d74]">
              Reading expenses, multi-splits,
              bookings and payments.
            </p>
          </div>
        </div>
      </TripShell>
    );
  }

  /* ======================================================================== */
  /* NOT FOUND                                                                */
  /* ======================================================================== */

  if (!trip) {
    return (
      <TripShell tripId={tripId}>
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="max-w-md rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8e5d9] text-[#566055]">
              <MapPin size={23} />
            </div>

            <h1 className="mt-5 font-serif text-3xl">
              Trip not found
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#817d74]">
              {error ||
                "This trip could not be loaded."}
            </p>

            <Link
              href="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white"
            >
              <ArrowLeft size={15} />
              Dashboard
            </Link>
          </div>
        </div>
      </TripShell>
    );
  }

  /* ======================================================================== */
  /* PAGE                                                                     */
  /* ======================================================================== */

  return (
    <TripShell tripId={tripId}>
      {/* ================================================================== */}
      {/* ERROR                                                              */}
      {/* ================================================================== */}

      {error && (
        <div className="mb-6 flex items-start justify-between gap-4 rounded-[24px] border border-red-200 bg-red-50 p-5">
          <div>
            <p className="font-bold text-red-800">
              Settlement issue
            </p>

            <p className="mt-1 text-sm leading-6 text-red-700">
              {error}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            className="text-red-700"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* ================================================================== */}
      {/* COMPLETED BANNER                                                   */}
      {/* ================================================================== */}

      {completed && (
        <section className="mb-6 overflow-hidden rounded-[30px] border border-[#9bad98] bg-[#e8eee5] p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#355244] text-white">
                <Lock size={21} />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={16}
                    className="text-[#355244]"
                  />

                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#355244]">
                    Trip completed
                  </p>
                </div>

                <h2 className="mt-1 font-serif text-2xl">
                  This trip is frozen
                </h2>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-[#667166]">
                  Expenses, splits, bookings and
                  itinerary changes are locked.
                  This settlement report represents
                  the completed trip.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={generatePdf}
              disabled={generatingPdf}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              <Download size={16} />

              {generatingPdf
                ? "Generating..."
                : "Download final PDF"}
            </button>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* HERO                                                               */}
      {/* ================================================================== */}

      <section className="relative overflow-hidden rounded-[34px] border border-[#292a25]/10 bg-[#1c2721] p-7 text-white shadow-[0_25px_70px_rgba(30,40,30,.12)] md:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.08) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />

        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[.22em] text-[#d5c18e]">
            <span className="h-px w-8 bg-[#d5c18e]" />

            Settlement

            <span className="text-white/30">
              /
            </span>

            {trip.destination ||
              "Complete trip ledger"}
          </div>

          <div className="mt-7 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-serif text-[48px] leading-[.95] tracking-[-.045em] sm:text-[62px]">
                  Final settlement
                </h1>

                {completed && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d7e4d3] px-3 py-1.5 text-xs font-bold text-[#355244]">
                    <Lock size={13} />
                    Frozen
                  </span>
                )}
              </div>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65">
                Every expense, booking, multi-split
                allocation and settlement transaction
                for <b>{trip.name}</b> is connected
                here.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {trip.destination && (
                  <InfoPill
                    icon={
                      <MapPin size={14} />
                    }
                    text={
                      trip.destination
                    }
                  />
                )}

                <InfoPill
                  icon={
                    <Users size={14} />
                  }
                  text={`${members.length} travelers`}
                />

                <InfoPill
                  icon={
                    <Receipt size={14} />
                  }
                  text={`${expenses.length} expenses`}
                />

                <InfoPill
                  icon={
                    <Scale size={14} />
                  }
                  text={`${splitCount} split allocations`}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  loadSettlement(true)
                }
                disabled={refreshing}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold backdrop-blur transition hover:bg-white/15 disabled:opacity-50"
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

              <button
                type="button"
                onClick={generatePdf}
                disabled={generatingPdf}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#f4f0e6] px-5 py-3 text-sm font-bold text-[#191a18] transition hover:-translate-y-0.5 disabled:opacity-50"
              >
                <Download size={15} />

                {generatingPdf
                  ? "Creating PDF..."
                  : "PDF report"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* SUMMARY CARDS                                                      */}
      {/* ================================================================== */}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          icon={
            <CircleDollarSign
              size={19}
            />
          }
          label="Complete trip spend"
          value={formatMoney(
            totalTripSpend
          )}
          detail="Expenses + bookings"
        />

        <StatCard
          icon={
            <Receipt size={19} />
          }
          label="Expenses"
          value={formatMoney(
            totalExpenses
          )}
          detail={`${expenses.length} recorded`}
        />

        <StatCard
          icon={
            <Hotel size={19} />
          }
          label="Bookings"
          value={formatMoney(
            totalBookings
          )}
          detail={`${bookings.length} bookings`}
        />

        <StatCard
          icon={
            <Scale size={19} />
          }
          label="Multi-split"
          value={String(
            splitCount
          )}
          detail="Participant allocations"
        />

        <StatCard
          icon={
            <Send size={19} />
          }
          label="Outstanding"
          value={formatMoney(
            totalOwed
          )}
          detail={
            transfers.length
              ? `${transfers.length} transfer${
                  transfers.length === 1
                    ? ""
                    : "s"
                }`
              : "All settled"
          }
        />
      </section>

      {/* ================================================================== */}
      {/* TABS                                                               */}
      {/* ================================================================== */}

      <section className="mt-8 rounded-[28px] border border-[#292a25]/10 bg-[#f8f5ec] p-2">
        <div className="grid gap-2 sm:grid-cols-4">
          <TabButton
            active={
              activeTab ===
              "overview"
            }
            onClick={() =>
              setActiveTab(
                "overview"
              )
            }
            icon={
              <WalletCards
                size={16}
              />
            }
            label="Balances"
          />

          <TabButton
            active={
              activeTab ===
              "splits"
            }
            onClick={() =>
              setActiveTab(
                "splits"
              )
            }
            icon={
              <Scale size={16} />
            }
            label="Multi-splits"
          />

          <TabButton
            active={
              activeTab ===
              "transactions"
            }
            onClick={() =>
              setActiveTab(
                "transactions"
              )
            }
            icon={
              <Receipt
                size={16}
              />
            }
            label="All transactions"
          />

          <TabButton
            active={
              activeTab ===
              "settlements"
            }
            onClick={() =>
              setActiveTab(
                "settlements"
              )
            }
            icon={
              <Send size={16} />
            }
            label="Settlement"
          />
        </div>
      </section>

      {/* ================================================================== */}
      {/* OVERVIEW                                                           */}
      {/* ================================================================== */}

      {activeTab ===
        "overview" && (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 md:p-7">
            <SectionHeading
              eyebrow="Who paid what"
              title="Participant balances"
              description="The final net position is calculated from every recorded expense and its multi-split allocations."
            />

            <div className="mt-6 space-y-3">
              {balances.length ? (
                balances.map(
                  (balance) => (
                    <BalanceRow
                      key={
                        balance.userId
                      }
                      balance={
                        balance
                      }
                    />
                  )
                )
              ) : (
                <EmptyBox
                  title="No balances yet"
                  description="Add expenses with participant splits to calculate the trip settlement."
                />
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-[#292a25]/10 bg-[#e8e3d5] p-6 md:p-7">
              <SectionHeading
                eyebrow="Split methods"
                title="Multi-split coverage"
                description="Every allocation is preserved so the group can see exactly how each expense was shared."
              />

              <div className="mt-6 space-y-3">
                {[
                  "Equal",
                  "Exact",
                  "Percentage",
                  "Shares",
                ].map(
                  (mode) => (
                    <div
                      key={mode}
                      className="flex items-center justify-between rounded-2xl bg-[#f8f5ec] px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d9dfd5] text-[#355244]">
                          <Scale
                            size={15}
                          />
                        </div>

                        <span className="text-sm font-bold">
                          {mode}
                        </span>
                      </div>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#68655d]">
                        {splitModes[
                          mode
                        ] || 0}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 md:p-7">
              <SectionHeading
                eyebrow="Trip integrity"
                title="Settlement status"
                description="Use this page as the final financial checkpoint before closing the journey."
              />

              <div className="mt-6 space-y-3">
                <StatusCheck
                  done={
                    expenses.length >
                    0
                  }
                  label="Trip expenses recorded"
                />

                <StatusCheck
                  done={
                    splitCount >
                    0 ||
                    expenses.length ===
                      0
                  }
                  label="Expense allocations recorded"
                />

                <StatusCheck
                  done={
                    transfers.length ===
                    0
                  }
                  label="Outstanding balances settled"
                />

                <StatusCheck
                  done={
                    payments.length >
                    0 ||
                    transfers.length ===
                      0
                  }
                  label="Settlement activity tracked"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* MULTI SPLITS                                                        */}
      {/* ================================================================== */}

      {activeTab ===
        "splits" && (
        <section className="mt-6">
          <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 md:p-7">
            <SectionHeading
              eyebrow="Complete split ledger"
              title="Every multi-split allocation"
              description="Expand an expense to see the exact amount assigned to every participant."
            />

            <div className="mt-7 space-y-3">
              {expenses.length ? (
                expenses.map(
                  (expense) => {
                    const expenseSplits =
                      splits.filter(
                        (split) =>
                          split.expense_id ===
                          expense.id
                      );

                    const expanded =
                      expandedExpense ===
                      expense.id;

                    return (
                      <div
                        key={
                          expense.id
                        }
                        className="overflow-hidden rounded-[24px] border border-[#292a25]/10 bg-white"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedExpense(
                              expanded
                                ? null
                                : expense.id
                            )
                          }
                          className="flex w-full items-center justify-between gap-4 p-5 text-left"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055]">
                              <Receipt
                                size={18}
                              />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold">
                                {
                                  expense.title
                                }
                              </p>

                              <p className="mt-1 text-xs text-[#817d74]">
                                {expenseSplits.length ||
                                  0}{" "}
                                participant
                                allocation
                                {expenseSplits.length ===
                                1
                                  ? ""
                                  : "s"}{" "}
                                · paid by{" "}
                                {getMemberName(
                                  members,
                                  expense.paid_by
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-3">
                            <span className="font-serif text-xl font-bold">
                              {formatMoney(
                                Number(
                                  expense.amount
                                )
                              )}
                            </span>

                            <ChevronDown
                              size={18}
                              className={
                                expanded
                                  ? "rotate-180 transition"
                                  : "transition"
                              }
                            />
                          </div>
                        </button>

                        {expanded && (
                          <div className="border-t border-[#292a25]/8 bg-[#f8f5ec] p-5">
                            {expenseSplits.length ? (
                              <>
                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                  <span className="rounded-full bg-[#e1ebe1] px-3 py-1.5 text-xs font-bold text-[#355244]">
                                    {normalizeSplitType(
                                      expenseSplits[0]
                                        ?.split_type
                                    )}{" "}
                                    split
                                  </span>

                                  <span className="rounded-full bg-[#e8e5d9] px-3 py-1.5 text-xs font-bold text-[#68655d]">
                                    Total{" "}
                                    {formatMoney(
                                      Number(
                                        expense.amount
                                      )
                                    )}
                                  </span>
                                </div>

                                <div className="space-y-2">
                                  {expenseSplits.map(
                                    (
                                      split
                                    ) => (
                                      <div
                                        key={
                                          split.id
                                        }
                                        className="flex items-center justify-between rounded-2xl bg-white p-4"
                                      >
                                        <div className="flex items-center gap-3">
                                          <PersonBubble
                                            name={getMemberName(
                                              members,
                                              split.participant_id
                                            )}
                                          />

                                          <div>
                                            <p className="text-sm font-bold">
                                              {getMemberName(
                                                members,
                                                split.participant_id
                                              )}
                                            </p>

                                            <p className="mt-1 text-xs text-[#817d74]">
                                              {
                                                split.split_type
                                              }
                                            </p>
                                          </div>
                                        </div>

                                        <p className="font-serif text-lg font-bold">
                                          {formatMoney(
                                            Number(
                                              split.amount
                                            )
                                          )}
                                        </p>
                                      </div>
                                    )
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="rounded-2xl border border-dashed border-[#292a25]/15 p-5 text-center">
                                <p className="font-bold">
                                  No split records found
                                </p>

                                <p className="mt-1 text-xs text-[#817d74]">
                                  This legacy expense will use equal splitting in the settlement calculation.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }
                )
              ) : (
                <EmptyBox
                  title="No expenses"
                  description="There are no expense splits to display yet."
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* TRANSACTIONS                                                        */}
      {/* ================================================================== */}

      {activeTab ===
        "transactions" && (
        <section className="mt-6">
          <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 md:p-7">
            <SectionHeading
              eyebrow="Complete trip ledger"
              title="Every transaction"
              description="Expenses, bookings and settlement payments are shown together so the complete trip financial history is visible."
            />

            <div className="mt-7 overflow-x-auto">
              <table className="w-full min-w-[780px] border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-[9px] font-bold uppercase tracking-[.15em] text-[#8b877d]">
                    <th className="px-4 py-2">
                      Type
                    </th>

                    <th className="px-4 py-2">
                      Transaction
                    </th>

                    <th className="px-4 py-2">
                      Paid by
                    </th>

                    <th className="px-4 py-2">
                      Details
                    </th>

                    <th className="px-4 py-2 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactionRows.map(
                    (row) => (
                      <tr
                        key={
                          row.id
                        }
                        className="bg-white"
                      >
                        <td className="rounded-l-2xl px-4 py-4">
                          <TransactionType
                            type={
                              row.type
                            }
                          />
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-bold">
                            {
                              row.title
                            }
                          </p>

                          <p className="mt-1 text-xs text-[#8b877d]">
                            {formatDate(
                              row.date
                            )}
                          </p>
                        </td>

                        <td className="px-4 py-4 text-sm">
                          {
                            row.payer
                          }
                        </td>

                        <td className="px-4 py-4 text-sm text-[#68655d]">
                          {
                            row.detail
                          }
                        </td>

                        <td className="rounded-r-2xl px-4 py-4 text-right font-serif text-lg font-bold">
                          {formatMoney(
                            row.amount
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* SETTLEMENT                                                          */}
      {/* ================================================================== */}

      {activeTab ===
        "settlements" && (
        <section className="mt-6 grid gap-6 xl:grid-cols-[1fr_.8fr]">
          <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 md:p-7">
            <SectionHeading
              eyebrow="Suggested transfers"
              title="Settle the group"
              description="These transfers minimize the number of payments required to settle the calculated balances."
            />

            <div className="mt-7 space-y-3">
              {transfers.length ? (
                transfers.map(
                  (
                    transfer,
                    index
                  ) => {
                    const key =
                      `${transfer.fromId}-${transfer.toId}-${transfer.amount}`;

                    const fromName =
                      transfer.fromName ||
                      transfer.from ||
                      getMemberName(
                        members,
                        transfer.fromId
                      );

                    const toName =
                      transfer.toName ||
                      transfer.to ||
                      getMemberName(
                        members,
                        transfer.toId
                      );

                    return (
                      <div
                        key={`${key}-${index}`}
                        className="rounded-[24px] border border-[#292a25]/10 bg-white p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-3">
                            <PersonBubble
                              name={
                                fromName
                              }
                            />

                            <div>
                              <p className="text-sm font-bold">
                                {fromName}
                              </p>

                              <p className="mt-1 text-xs text-[#817d74]">
                                needs to pay
                              </p>
                            </div>

                            <ArrowRight
                              size={18}
                              className="mx-2 text-[#aaa59a]"
                            />

                            <PersonBubble
                              name={
                                toName
                              }
                            />

                            <div>
                              <p className="text-sm font-bold">
                                {toName}
                              </p>

                              <p className="mt-1 text-xs text-[#817d74]">
                                receives
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-4 md:justify-end">
                            <p className="font-serif text-2xl font-bold">
                              {formatMoney(
                                transfer.amount
                              )}
                            </p>

                            {!completed && (
                              <button
                                type="button"
                                onClick={() =>
                                  markTransferPaid(
                                    transfer
                                  )
                                }
                                disabled={
                                  payingTransfer ===
                                  key
                                }
                                className="inline-flex items-center gap-2 rounded-full bg-[#355244] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                              >
                                {payingTransfer ===
                                key ? (
                                  <RefreshCw
                                    size={14}
                                    className="animate-spin"
                                  />
                                ) : (
                                  <Check
                                    size={14}
                                  />
                                )}

                                Mark paid
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )
              ) : (
                <div className="rounded-[24px] border border-[#9bad98] bg-[#e8eee5] p-7 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#355244] text-white">
                    <CheckCircle2
                      size={25}
                    />
                  </div>

                  <h3 className="mt-5 font-serif text-2xl">
                    All balances are settled
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667166]">
                    There are no outstanding transfers
                    between the participants.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[30px] border border-[#292a25]/10 bg-[#e8e3d5] p-6 md:p-7">
              <SectionHeading
                eyebrow="Completed payments"
                title="Settlement history"
                description="Every recorded payment remains part of the trip's financial history."
              />

              <div className="mt-6 space-y-2">
                {payments.length ? (
                  payments.map(
                    (payment) => (
                      <div
                        key={
                          payment.id
                        }
                        className="rounded-2xl bg-[#f8f5ec] p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold">
                              {
                                getMemberName(
                                  members,
                                  payment.payer_id
                                )
                              }{" "}
                              →{" "}
                              {
                                getMemberName(
                                  members,
                                  payment.receiver_id
                                )
                              }
                            </p>

                            <p className="mt-1 text-xs text-[#817d74]">
                              {formatDate(
                                payment.completed_at ||
                                  payment.created_at
                              )}
                            </p>
                          </div>

                          <p className="font-serif text-lg font-bold">
                            {formatMoney(
                              Number(
                                payment.amount
                              )
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )
                ) : (
                  <p className="rounded-2xl bg-[#f8f5ec] p-5 text-center text-sm text-[#817d74]">
                    No settlement payments have been recorded yet.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-[30px] border border-[#292a25]/10 bg-[#f8f5ec] p-6 md:p-7">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={20}
                  className="mt-0.5 text-[#355244]"
                />

                <div>
                  <p className="font-bold">
                    Settlement integrity
                  </p>

                  <p className="mt-1 text-sm leading-6 text-[#817d74]">
                    Payments are recorded against the
                    trip and reflected in the settlement
                    calculation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ================================================================== */}
      {/* FINAL ACTIONS                                                       */}
      {/* ================================================================== */}

      <section className="mt-8 overflow-hidden rounded-[30px] border border-[#292a25]/10 bg-gradient-to-r from-[#eef5ff] via-white to-[#f5f0df] p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f8f5ec] text-[#355244] shadow-sm">
              {completed ? (
                <Lock size={20} />
              ) : (
                <Sparkles size={20} />
              )}
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#60718e]">
                Final trip control
              </p>

              <h2 className="mt-1 font-serif text-2xl">
                {completed
                  ? "This journey is complete."
                  : "Ready to close this journey?"}
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#68655d]">
                {completed
                  ? "The trip is now frozen. Your final settlement and PDF report preserve the complete financial history."
                  : "End Trip will freeze the financial and planning records. Make sure every expense, booking and settlement is correct first."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={generatePdf}
              disabled={generatingPdf}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#292a25]/15 bg-[#f8f5ec] px-5 py-3 text-sm font-bold disabled:opacity-50"
            >
              <FileText size={16} />

              Generate report
            </button>

            {!completed && (
              <button
                type="button"
                onClick={() =>
                  setShowEndTrip(
                    true
                  )
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white"
              >
                <Lock size={16} />

                End Trip
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* NAVIGATION                                                          */}
      {/* ================================================================== */}

      <div className="mt-8 flex flex-wrap items-center gap-5">
        <Link
          href={`/trip/${tripId}/expenses`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#355244] hover:underline"
        >
          <Receipt size={15} />
          Expenses
        </Link>

        <Link
          href={`/trip/${tripId}/bookings`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#355244] hover:underline"
        >
          <Hotel size={15} />
          Bookings
        </Link>

        <Link
          href={`/trip/${tripId}/itinerary`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#355244] hover:underline"
        >
          <Route size={15} />
          Itinerary
        </Link>

        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-bold text-[#355244] hover:underline"
        >
          <ArrowLeft size={15} />
          Dashboard
        </Link>
      </div>

      {/* ================================================================== */}
      {/* END TRIP MODAL                                                      */}
      {/* ================================================================== */}

      {showEndTrip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#191a18]/55 p-5 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[32px] border border-[#292a25]/10 bg-[#f8f5ec] p-7 shadow-2xl md:p-9">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8e5d9] text-[#566055]">
              <Lock size={24} />
            </div>

            <h2 className="mt-6 font-serif text-3xl">
              End this trip?
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#68655d]">
              This is the final step for{" "}
              <b>{trip.name}</b>.
            </p>

            <div className="mt-5 space-y-2 rounded-2xl bg-white p-5">
              <ModalCheck
                text="Expenses will become read-only"
              />

              <ModalCheck
                text="Multi-split allocations will be frozen"
              />

              <ModalCheck
                text="Bookings will become read-only"
              />

              <ModalCheck
                text="The trip will move to Completed Trips"
              />

              <ModalCheck
                text="The final PDF report can be generated"
              />
            </div>

            {transfers.length > 0 && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">
                  Outstanding settlement detected
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-800">
                  There are{" "}
                  {transfers.length}{" "}
                  remaining transfer
                  {transfers.length ===
                  1
                    ? ""
                    : "s"}{" "}
                  totaling{" "}
                  {formatMoney(
                    transfers.reduce(
                      (
                        sum,
                        transfer
                      ) =>
                        sum +
                        transfer.amount,
                      0
                    )
                  )}
                  .
                </p>
              </div>
            )}

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowEndTrip(
                    false
                  )
                }
                disabled={endingTrip}
                className="rounded-full border border-[#292a25]/15 bg-white px-5 py-3 text-sm font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={endTrip}
                disabled={
                  endingTrip ||
                  transfers.length >
                    0
                }
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#191a18] px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {endingTrip ? (
                  <RefreshCw
                    size={15}
                    className="animate-spin"
                  />
                ) : (
                  <Lock size={15} />
                )}

                {endingTrip
                  ? "Ending trip..."
                  : "Confirm & Freeze Trip"}
              </button>
            </div>
          </div>
        </div>
      )}
    </TripShell>
  );
}

/* ========================================================================== */
/* SHELL                                                                      */
/* ========================================================================== */

function TripShell({
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
          <div className="mx-auto flex h-[78px] max-w-[1450px] items-center justify-between px-5 md:px-8">
            <Link
              href="/dashboard"
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

        <section className="mx-auto max-w-[1250px] px-5 py-8 md:px-8 md:py-10">
          {children}
        </section>
      </div>
    </main>
  );
}

/* ========================================================================== */
/* COMPONENTS                                                                 */
/* ========================================================================== */

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#927543]">
        {eyebrow}
      </p>

      <h2 className="mt-2 font-serif text-3xl">
        {title}
      </h2>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#817d74]">
        {description}
      </p>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-[25px] border border-[#292a25]/10 bg-[#f8f5ec] p-5 shadow-[0_10px_35px_rgba(40,40,30,.035)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e8e5d9] text-[#566055]">
          {icon}
        </div>

        <span className="text-[9px] font-bold uppercase tracking-[.15em] text-[#aaa59a]">
          Trip
        </span>
      </div>

      <p className="mt-5 text-[10px] font-bold uppercase tracking-[.14em] text-[#8b877d]">
        {label}
      </p>

      <p className="mt-1 font-serif text-2xl">
        {value}
      </p>

      <p className="mt-1 text-xs text-[#8b877d]">
        {detail}
      </p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-center gap-2 rounded-[20px] px-4 py-3 text-sm font-bold transition ${
        active
          ? "bg-[#191a18] text-white"
          : "text-[#68655d] hover:bg-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function BalanceRow({
  balance,
}: {
  balance: Balance;
}) {
  const positive =
    balance.net >= 0;

  return (
    <div className="rounded-[23px] border border-[#292a25]/8 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <PersonBubble
            name={
              balance.name
            }
          />

          <div>
            <p className="font-bold">
              {balance.name}
            </p>

            <p className="mt-1 text-xs text-[#817d74]">
              Paid{" "}
              {formatMoney(
                balance.paid
              )}{" "}
              · share{" "}
              {formatMoney(
                balance.owed
              )}
            </p>
          </div>
        </div>

        <div className="text-left md:text-right">
          <p
            className={`font-serif text-2xl font-bold ${
              positive
                ? "text-[#355244]"
                : "text-[#8c5148]"
            }`}
          >
            {positive
              ? "+"
              : ""}
            {formatMoney(
              balance.net
            )}
          </p>

          <p className="mt-1 text-xs text-[#817d74]">
            {positive
              ? "should receive"
              : "needs to pay"}
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusCheck({
  done,
  label,
}: {
  done: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl ${
          done
            ? "bg-[#d9e5d6] text-[#355244]"
            : "bg-[#e8e5d9] text-[#aaa59a]"
        }`}
      >
        {done ? (
          <Check size={16} />
        ) : (
          <Clock3 size={16} />
        )}
      </div>

      <span className="text-sm font-bold">
        {label}
      </span>
    </div>
  );
}

function TransactionType({
  type,
}: {
  type:
    | "expense"
    | "booking"
    | "payment";
}) {
  const data = {
    expense: {
      label: "Expense",
      icon: <Receipt size={14} />,
      className:
        "bg-[#e8e5d9] text-[#566055]",
    },
    booking: {
      label: "Booking",
      icon: <Hotel size={14} />,
      className:
        "bg-[#dce8f6] text-[#46627f]",
    },
    payment: {
      label: "Payment",
      icon: <Send size={14} />,
      className:
        "bg-[#e1ebe1] text-[#355244]",
    },
  }[type];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold ${data.className}`}
    >
      {data.icon}
      {data.label}
    </span>
  );
}

function PersonBubble({
  name,
}: {
  name?: string | null;
}) {
  const safeName =
    name?.trim() ||
    "Traveler";

  return (
    <div
      title={safeName}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#292a25]/10 bg-[#e8e5d9] text-xs font-bold text-[#566055]"
    >
      {safeName
        .charAt(0)
        .toUpperCase()}
    </div>
  );
}

function InfoPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white/90 backdrop-blur">
      {icon}
      {text}
    </span>
  );
}

function EmptyBox({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-[#292a25]/15 bg-white/60 p-7 text-center">
      <p className="font-serif text-xl">
        {title}
      </p>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#817d74]">
        {description}
      </p>
    </div>
  );
}

function ModalCheck({
  text,
}: {
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e1ebe1] text-[#355244]">
        <Check size={14} />
      </div>

      <span>{text}</span>
    </div>
  );
}

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

function getMemberProfile(
  member: Member
): Profile | null {
  if (member.profile) {
    return member.profile;
  }

  if (
    Array.isArray(
      member.profiles
    )
  ) {
    return (
      member.profiles[0] ||
      null
    );
  }

  return (
    member.profiles || null
  );
}

function getMemberName(
  members: Member[],
  userId: string | null
) {
  if (!userId) {
    return "Traveler";
  }

  const member =
    members.find(
      (item) =>
        item.user_id === userId
    );

  if (!member) {
    return "Traveler";
  }

  const profile =
    getMemberProfile(member);

  return (
    profile?.name?.trim() ||
    profile?.email?.trim() ||
    "Traveler"
  );
}

function normalizeSplitType(
  value?: string | null
) {
  const clean =
    value
      ?.toLowerCase()
      .replace(
        /[_-]/g,
        " "
      )
      .trim();

  if (
    clean ===
    "percentage"
  ) {
    return "Percentage";
  }

  if (
    clean ===
    "percent"
  ) {
    return "Percentage";
  }

  if (
    clean ===
    "exact"
  ) {
    return "Exact";
  }

  if (
    clean ===
    "shares"
  ) {
    return "Shares";
  }

  if (
    clean ===
    "equal"
  ) {
    return "Equal";
  }

  return (
    value || "Equal"
  );
}

function formatMoney(
  amount: number
) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }
  ).format(
    Number(amount || 0)
  );
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Date not set";
  }

  const date =
    new Date(
      value.includes("T")
        ? value
        : `${value}T00:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function formatDateRange(
  start: string | null,
  end: string | null
) {
  if (!start && !end) {
    return "Dates not set";
  }

  if (start && !end) {
    return formatDate(
      start
    );
  }

  if (!start && end) {
    return formatDate(end);
  }

  return `${formatDate(
    start
  )} → ${formatDate(end)}`;
}