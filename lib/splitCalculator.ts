export function equalSplit(
  total: number,
  participantIds: string[]
) {
  if (!participantIds.length) {
    return {};
  }

  const result: Record<string, number> = {};

  const base =
    Math.floor(
      (total * 100) /
        participantIds.length
    ) / 100;

  let allocated = 0;

  participantIds.forEach(
    (id, index) => {
      const amount =
        index ===
        participantIds.length - 1
          ? Number(
              (
                total -
                allocated
              ).toFixed(2)
            )
          : base;

      result[id] = amount;

      allocated += amount;
    }
  );

  return result;
}

export function exactSplit(
  amounts: Record<string, number>,
  total: number
) {
  const sum = Object.values(
    amounts
  ).reduce(
    (a, b) => a + b,
    0
  );

  if (
    Math.abs(sum - total) >
    0.01
  ) {
    throw new Error(
      `Exact split must equal ₹${total.toFixed(
        2
      )}.`
    );
  }

  return amounts;
}

export function percentageSplit(
  percentages: Record<
    string,
    number
  >,
  total: number
) {
  const sum = Object.values(
    percentages
  ).reduce(
    (a, b) => a + b,
    0
  );

  if (
    Math.abs(sum - 100) >
    0.01
  ) {
    throw new Error(
      "Percentages must add up to 100."
    );
  }

  return Object.fromEntries(
    Object.entries(
      percentages
    ).map(
      ([id, percentage]) => [
        id,
        Number(
          (
            (total *
              percentage) /
            100
          ).toFixed(2)
        ),
      ]
    )
  );
}

export function sharesSplit(
  shares: Record<string, number>,
  total: number
) {
  const totalShares =
    Object.values(
      shares
    ).reduce(
      (a, b) => a + b,
      0
    );

  if (!totalShares) {
    throw new Error(
      "At least one share is required."
    );
  }

  return Object.fromEntries(
    Object.entries(shares).map(
      ([id, share]) => [
        id,
        Number(
          (
            (total * share) /
            totalShares
          ).toFixed(2)
        ),
      ]
    )
  );
}