import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    bookings: [],
  });
}

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json(
    {
      ok: true,
      message: "Create booking here",
      booking: body,
    },
    { status: 201 },
  );
}