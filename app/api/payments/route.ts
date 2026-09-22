import { NextResponse } from "next/server";
import { createUpiLink } from "@/lib/upi";

export async function POST(request: Request) {
  const body = await request.json();
  const upiLink = createUpiLink(body);
  return NextResponse.json({ upiLink });
}
