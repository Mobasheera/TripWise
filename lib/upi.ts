export function createUpiPaymentLink({
  payeeUpiId,
  payeeName,
  amount,
}: {
  payeeUpiId: string;
  payeeName: string;
  amount: number;
}) {
  const params = new URLSearchParams({
    pa: payeeUpiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
  });

  return `upi://pay?${params.toString()}`;
}

export function openUpiPayment({
  payeeUpiId,
  payeeName,
  amount,
}: {
  payeeUpiId: string;
  payeeName: string;
  amount: number;
}) {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href = createUpiPaymentLink({
    payeeUpiId,
    payeeName,
    amount,
  });
}

export function createGooglePayPaymentLink({
  payeeUpiId,
  payeeName,
  amount,
}: {
  payeeUpiId: string;
  payeeName: string;
  amount: number;
}) {
  const params = new URLSearchParams({
    pa: payeeUpiId,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
  });

  return `gpay://upi/pay?${params.toString()}`;
}

export function openGooglePayPayment({
  payeeUpiId,
  payeeName,
  amount,
}: {
  payeeUpiId: string;
  payeeName: string;
  amount: number;
}) {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href = createGooglePayPaymentLink({
    payeeUpiId,
    payeeName,
    amount,
  });
}