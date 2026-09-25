export interface IcsEventOptions {
  title: string;
  description: string;
  location?: string;
  startsAt: Date | string;
  endsAt?: Date | string;
  url?: string;
  organizerName?: string;
  organizerEmail?: string;
}

function formatDateToICS(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function generateIcsString(opts: IcsEventOptions): string {
  const start = typeof opts.startsAt === "string" ? new Date(opts.startsAt) : opts.startsAt;
  const end = opts.endsAt
    ? typeof opts.endsAt === "string"
      ? new Date(opts.endsAt)
      : opts.endsAt
    : new Date(start.getTime() + 2 * 60 * 60 * 1000); // default 2 hours

  const now = new Date();
  const uid = `tm-${start.getTime()}-${Math.random().toString(36).substring(2, 9)}@themothers.cc`;
  const orgName = opts.organizerName || "The Mothers Barcelona";
  const orgEmail = opts.organizerEmail || "hello@themothers.cc";

  // Sanitize description for ICS
  const cleanDescription = opts.description
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

  const cleanLocation = (opts.location || "Barcelona, Spain")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, " ");

  const cleanTitle = opts.title
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The Mothers Barcelona//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDateToICS(now)}`,
    `DTSTART:${formatDateToICS(start)}`,
    `DTEND:${formatDateToICS(end)}`,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:${cleanDescription}`,
    `LOCATION:${cleanLocation}`,
    opts.url ? `URL:${opts.url}` : `URL:https://themothers.cc`,
    `ORGANIZER;CN=${orgName}:mailto:${orgEmail}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT24H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: The Mothers gathering tomorrow",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function generateIcsDataUri(opts: IcsEventOptions): string {
  const ics = generateIcsString(opts);
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
