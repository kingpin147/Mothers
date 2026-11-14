import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { community, person } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = (rawCode || "").trim().toUpperCase();

  if (!code) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 1. Check Community invite code
  const [matchedCommunity] = await db
    .select({ id: community.id, inviteCode: community.inviteCode, name: community.name })
    .from(community)
    .where(sql`UPPER(${community.inviteCode}) = ${code}`)
    .limit(1);

  if (matchedCommunity) {
    const response = NextResponse.redirect(new URL(`/events?join=${matchedCommunity.inviteCode}`, request.url));
    response.cookies.set("mothers_joined_community", matchedCommunity.inviteCode, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false,
    });
    return response;
  }

  // 2. Check Person Godmother / Referral invite code
  const [matchedPerson] = await db
    .select({ id: person.id, inviteCode: person.inviteCode, godmotherCode: person.godmotherCode })
    .from(person)
    .where(sql`UPPER(${person.inviteCode}) = ${code} OR UPPER(${person.godmotherCode}) = ${code}`)
    .limit(1);

  if (matchedPerson) {
    const response = NextResponse.redirect(new URL(`/register?ref=${code}`, request.url));
    response.cookies.set("mothers_referral_code", code, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: false,
    });
    return response;
  }

  return NextResponse.redirect(new URL("/", request.url));
}
