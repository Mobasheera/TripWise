import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ ok: true, trips: [] }); }
export async function POST(req: Request) { return NextResponse.json({ ok: true, trip: await req.json() }, { status: 201 }); }
