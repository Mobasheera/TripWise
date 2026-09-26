export type Balance = {
  userId: string;
  amount: number;
};

export type Settlement = {
  from: string;
  to: string;
  amount: number;
};

export function minimizeTransactions(
  balances: Balance[]
): Settlement[] {
  const creditors = balances
    .filter(
      (balance) =>
        balance.amount > 0.009
    )
    .map((balance) => ({
      ...balance,
    }))
    .sort(
      (a, b) =>
        b.amount - a.amount
    );

  const debtors = balances
    .filter(
      (balance) =>
        balance.amount < -0.009
    )
    .map((balance) => ({
      ...balance,
    }))
    .sort(
      (a, b) =>
        a.amount - b.amount
    );

  const result: Settlement[] = [];

  let debtorIndex = 0;
  let creditorIndex = 0;

  while (
    debtorIndex <
      debtors.length &&
    creditorIndex <
      creditors.length
  ) {
    const debtor =
      debtors[debtorIndex];

    const creditor =
      creditors[creditorIndex];

    const amount = Number(
      Math.min(
        Math.abs(debtor.amount),
        creditor.amount
      ).toFixed(2)
    );

    result.push({
      from: debtor.userId,
      to: creditor.userId,
      amount,
    });

    debtor.amount += amount;
    creditor.amount -= amount;

    if (
      Math.abs(debtor.amount) <
      0.01
    ) {
      debtorIndex++;
    }

    if (
      Math.abs(creditor.amount) <
      0.01
    ) {
      creditorIndex++;
    }
  }

  return result;
}