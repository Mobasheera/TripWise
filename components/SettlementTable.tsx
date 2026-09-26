type Settlement = {
  from: string;
  to: string;
  amount: number;
};

type Props = {
  children?: React.ReactNode;
  settlements?: Settlement[];
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SettlementTable({
  children,
  settlements = [],
}: Props) {
  return (
    <section className="rounded-2xl border border-line bg-[#fffdf7] p-5">
      <p className="text-sm font-semibold text-ink">
        Who pays whom?
      </p>

      {settlements.length > 0 && (
        <div className="mt-4 space-y-3">
          {settlements.map((settlement, index) => (
            <div
              key={`${settlement.from}-${settlement.to}-${index}`}
              className="flex flex-col gap-2 rounded-xl border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm text-ink">
                <span className="font-semibold">
                  {settlement.from}
                </span>

                <span className="mx-2 text-stone-400">
                  →
                </span>

                <span className="font-semibold">
                  {settlement.to}
                </span>
              </div>

              <b className="text-sm text-ink">
                {formatINR(settlement.amount)}
              </b>
            </div>
          ))}
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}