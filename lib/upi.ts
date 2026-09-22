export function createUpiLink({ upiId, name, amount, note }: { upiId: string; name: string; amount: number; note?: string }) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: amount.toFixed(2),
    cu: "INR",
    ...(note ? { tn: note } : {})
  });
  return `upi://pay?${params.toString()}`;
}
