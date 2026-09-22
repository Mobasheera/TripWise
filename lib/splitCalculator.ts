export type SplitType = "equal" | "participant" | "shared-room" | "activity" | "organizer";

export function calculateEqualSplit(amount: number, participantIds: string[]) {
  const share = amount / participantIds.length;
  return participantIds.map((participantId) => ({ participantId, amount: share }));
}

export function calculateExactSplit(amounts: Record<string, number>) {
  const total = Object.values(amounts).reduce((a, b) => a + b, 0);
  if (Math.abs(total - Object.values(amounts).reduce((a, b) => a + b, 0)) > 0.01) throw new Error("Invalid split");
  return Object.entries(amounts).map(([participantId, amount]) => ({ participantId, amount }));
}
