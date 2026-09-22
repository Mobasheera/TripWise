export type Balance = { participantId: string; amount: number };

export function calculateBalances(paid: Record<string, number>, owed: Record<string, number>) {
  const ids = new Set([...Object.keys(paid), ...Object.keys(owed)]);
  return [...ids].map((id) => ({
    participantId: id,
    amount: (paid[id] ?? 0) - (owed[id] ?? 0)
  }));
}

export function minimumTransactions(balances: Balance[]) {
  const creditors = balances.filter((b) => b.amount > 0.01).map((b) => ({...b}));
  const debtors = balances.filter((b) => b.amount < -0.01).map((b) => ({...b}));
  const result: { from: string; to: string; amount: number }[] = [];
  let i = 0, j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(-debtors[i].amount, creditors[j].amount);
    result.push({ from: debtors[i].participantId, to: creditors[j].participantId, amount });
    debtors[i].amount += amount;
    creditors[j].amount -= amount;
    if (Math.abs(debtors[i].amount) < 0.01) i++;
    if (Math.abs(creditors[j].amount) < 0.01) j++;
  }
  return result;
}
