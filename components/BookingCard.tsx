type Props = {
  children?: React.ReactNode;
  title?: string;
  amount?: number;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function BookingCard({
  children,
  title,
  amount,
}: Props) {
  return (
    <section className="rounded-2xl border border-line bg-[#fffdf7] p-5">
      {title !== undefined ? (
        <div className="flex items-center justify-between gap-4">
          <span className="font-semibold text-ink">{title}</span>

          {amount !== undefined && (
            <b className="text-ink">{formatINR(amount)}</b>
          )}
        </div>
      ) : (
        <p className="text-sm font-semibold text-ink">Booking</p>
      )}

      {children && <div className="mt-4">{children}</div>}
    </section>
  );
}