type Props = {
  children?: React.ReactNode;
  title?: string;
  amount?: number;
  payer?: string;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function ExpenseCard({
  children,
  title,
  amount,
  payer,
}: Props) {
  return (
    <section className="rounded-2xl border border-line bg-[#fffdf7] p-5">
      {title !== undefined || amount !== undefined || payer !== undefined ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <p className="font-semibold text-ink">{title}</p>
            )}

            {payer && (
              <p className="mt-1 text-sm text-stone-500">
                Paid by {payer}
              </p>
            )}
          </div>

          {amount !== undefined && (
            <b className="shrink-0 text-ink">
              {formatINR(amount)}
            </b>
          )}
        </div>
      ) : (
        <p className="text-sm font-semibold text-ink">Expense</p>
      )}

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}