import { NextResponse } from "next/server";
import { db } from "@/db";
import { leadEntry } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const { email, source = "countdown_banner", type = "waitlist" } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    await db.insert(leadEntry).values({
      email: email.trim().toLowerCase(),
      source,
      type,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating lead entry:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
