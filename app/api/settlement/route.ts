import { NextResponse } from "next/server";
import { calculateBalances, minimumTransactions } from "@/lib/settlement";

export async function POST(request: Request) {
  const { paid, owed } = await request.json();
  const balances = calculateBalances(paid ?? {}, owed ?? {});
  const transactions = minimumTransactions(balances);
  return NextResponse.json({ balances, transactions });
}
