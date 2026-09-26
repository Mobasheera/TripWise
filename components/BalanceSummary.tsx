type Props = {
  children?: React.ReactNode;
  totalExpense?: number;
  yourShare?: number;
  youReceive?: number;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function BalanceSummary({
  children,
  totalExpense,
  yourShare,
  youReceive,
}: Props) {
  const hasSummaryData =
    totalExpense !== undefined ||
    yourShare !== undefined ||
    youReceive !== undefined;

  return (
    <section className="rounded-2xl border border-line bg-[#fffdf7] p-5">
      <p className="text-sm font-semibold text-ink">Balance Summary</p>

      {hasSummaryData && (
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-sm text-stone-500">Total expense</p>
            <b className="mt-1 block text-2xl text-ink">
              {formatINR(totalExpense ?? 0)}
            </b>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-sm text-stone-500">Your share</p>
            <b className="mt-1 block text-2xl text-ink">
              {formatINR(yourShare ?? 0)}
            </b>
          </div>

          <div className="rounded-2xl border border-line bg-white p-5">
            <p className="text-sm text-stone-500">You receive</p>
            <b className="mt-1 block text-2xl text-ink">
              {formatINR(youReceive ?? 0)}
            </b>
          </div>
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}