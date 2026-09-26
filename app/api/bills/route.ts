import { NextResponse } from "next/server";
export async function GET() { return NextResponse.json({ ok: true, service: "bills" }); }
export async function POST() { return NextResponse.json({ ok: false, message: "Bill processing is wired in the AI pipeline branch." }, { status: 501 }); }
