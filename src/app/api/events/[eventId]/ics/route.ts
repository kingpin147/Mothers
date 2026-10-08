import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { event } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateIcsString } from "@/lib/ics";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await context.params;
    const { searchParams } = new URL(request.url);

    let title = searchParams.get("title") || "The Mothers Gathering";
    let startsAt: Date = new Date();
    let endsAt: Date | undefined = undefined;
    let location = searchParams.get("location") || "Barcelona, Spain";
    let description = searchParams.get("description") || "The Mothers Barcelona Gathering";

    if (eventId) {
      const foundEvent = await db.query.event.findFirst({
        where: eq(event.id, eventId),
      });

      if (foundEvent) {
        title = foundEvent.title;
        startsAt = new Date(foundEvent.startsAt);
        endsAt = foundEvent.endsAt ? new Date(foundEvent.endsAt) : undefined;
        location = foundEvent.meetingPoint || foundEvent.venueName || "Barcelona, Spain";
        description = foundEvent.description || `The Mothers gathering: ${foundEvent.title}. Meeting point: ${location}`;
      }
    }

    const customStartsAt = searchParams.get("startsAt");
    if (customStartsAt) {
      const parsed = new Date(customStartsAt);
      if (!isNaN(parsed.getTime())) {
        startsAt = parsed;
      }
    }

    const customEndsAt = searchParams.get("endsAt");
    if (customEndsAt) {
      const parsed = new Date(customEndsAt);
      if (!isNaN(parsed.getTime())) {
        endsAt = parsed;
      }
    }

    const icsContent = generateIcsString({
      title,
      description,
      location,
      startsAt,
      endsAt,
      url: `https://themothers.cc/events/${eventId}`,
    });

    const safeFilename = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "mothers-event";

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeFilename}.ics"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("[ICS Generation Error]", error);
    return new NextResponse("Error generating calendar file", { status: 500 });
  }
}
