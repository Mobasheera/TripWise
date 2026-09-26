import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    trips: [],
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json(
    {
      ok: true,
      message: "Create trip here",
      trip: body,
    },
    { status: 201 },
  );
}