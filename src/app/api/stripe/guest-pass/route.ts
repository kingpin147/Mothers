import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Event Passes have been discontinued. All event bookings are made with credits." },
    { status: 410 }
  );
}
