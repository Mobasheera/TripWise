import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ message: "Bill endpoint ready", bill: body }, { status: 201 });
}
