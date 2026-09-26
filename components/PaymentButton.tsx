"use client";

type Props = {
  children?: React.ReactNode;
  amount?: number;
  receiver?: string;
  onPay?: () => void;
  disabled?: boolean;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function PaymentButton({
  children,
  amount,
  receiver,
  onPay,
  disabled = false,
}: Props) {
  return (
    <div>
      <button
        type="button"
        onClick={onPay}
        disabled={disabled || !onPay}
        className="rounded-full bg-pine px-5 py-3 text-sm font-semibold text-paper transition hover:bg-[#16261f] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {amount !== undefined && receiver
          ? `Pay ${formatINR(amount)} to ${receiver} via UPI`
          : "Pay via UPI"}
      </button>

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}