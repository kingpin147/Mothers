import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ error: "Discontinued: Guest windows have been deprecated in favor of single member/non-member schedule." }, { status: 410 });
}
