import { NextRequest, NextResponse } from "next/server";
import { generateIcsString } from "@/lib/ics";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title") || "The Mothers Gathering";
    const location = searchParams.get("location") || "Barcelona, Spain";
    const description = searchParams.get("description") || "The Mothers Barcelona Gathering";
    
    let startsAt = new Date();
    const startsAtParam = searchParams.get("startsAt");
    if (startsAtParam) {
      const parsed = new Date(startsAtParam);
      if (!isNaN(parsed.getTime())) {
        startsAt = parsed;
      }
    }

    let endsAt: Date | undefined = undefined;
    const endsAtParam = searchParams.get("endsAt");
    if (endsAtParam) {
      const parsed = new Date(endsAtParam);
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
      url: "https://themothers.cc/events",
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
    console.error("[ICS Query Route Error]", error);
    return new NextResponse("Error generating calendar file", { status: 500 });
  }
}
