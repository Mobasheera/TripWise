import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ ok: true, bookings: [] }); }
export async function POST(req: Request) { return NextResponse.json({ ok: true, booking: await req.json() }, { status: 201 }); }
