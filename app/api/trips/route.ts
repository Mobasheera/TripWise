import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ trips: [] });
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json({ message: "Create trip here", trip: body }, { status: 201 });
}
