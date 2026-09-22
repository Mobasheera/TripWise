import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ expenses: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ message: "Create expense here", expense: body }, { status: 201 });
}
