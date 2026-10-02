import { NextResponse } from "next/server";
import { db } from "@/db";
import { leadEntry } from "@/db/schema";
import { z } from "zod";
import { sanitizeErrorMessage } from "@/lib/errors";

const createLeadSchema = z.object({
  email: z.string().trim().email("Valid email is required").toLowerCase(),
  source: z.string().trim().max(100).optional().default("countdown_banner"),
  type: z.string().trim().max(50).optional().default("waitlist"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = createLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    const { email, source, type } = parsed.data;

    await db.insert(leadEntry).values({
      email,
      source,
      type,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating lead entry:", error);
    return NextResponse.json(
      { error: sanitizeErrorMessage(error, "Internal Server Error") },
      { status: 500 }
    );
  }
}
