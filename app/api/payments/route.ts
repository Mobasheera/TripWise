import { NextResponse } from "next/server";

function createUpiLink(body: Record<string, unknown>) {
  const { upiId, name, amount, note, currency = "INR" } = body;

  const params = new URLSearchParams();

  if (typeof upiId === "string" && upiId) params.set("pa", upiId);
  if (typeof name === "string" && name) params.set("pn", name);
  if (typeof amount !== "undefined") params.set("am", String(amount));
  if (typeof note === "string" && note) params.set("tn", note);
  params.set("cu", String(currency));

  return `upi://pay?${params.toString()}`;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  const upiLink = createUpiLink(body);
  return NextResponse.json({ upiLink });
}
