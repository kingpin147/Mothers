/**
 * Centralized Date & Time formatting utilities for The Mothers.
 *
 * All club events take place in Barcelona, Spain.
 * To ensure complete consistency across Vercel cloud servers (which run in UTC),
 * client browsers, and all automated transactional emails, ALL event date/time
 * formatters MUST explicitly specify `timeZone: "Europe/Madrid"`.
 */

export const CLUB_TIMEZONE = "Europe/Madrid";

export type SupportedLocale = "en" | "es" | "fr";

function resolveIntlLocale(locale?: string | null): string {
  if (locale === "es") return "es-ES";
  if (locale === "fr") return "fr-FR";
  return "en-GB";
}

/**
 * Format time in 24-hour HH:MM format in Europe/Madrid timezone.
 * e.g. "11:00"
 */
export function formatEventTime(
  date: Date | string | number | null | undefined,
  locale?: string | null
): string {
  if (!date) return "";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(resolveIntlLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: CLUB_TIMEZONE,
  });
}

/**
 * Format date in Europe/Madrid timezone.
 * e.g. "Saturday 28 Nov" or "Saturday 28 November"
 */
export function formatEventDate(
  date: Date | string | number | null | undefined,
  locale?: string | null,
  options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "short",
  }
): string {
  if (!date) return "";
  const d = typeof date === "object" ? date : new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(resolveIntlLocale(locale), {
    ...options,
    timeZone: CLUB_TIMEZONE,
  });
}

/**
 * Format combined Date & Time range in Europe/Madrid timezone.
 * e.g. "Saturday 28 Nov, 11:00 – 13:00" or "Saturday 28 Nov, 11:00"
 */
export function formatEventDateTime(
  startsAt: Date | string | number | null | undefined,
  endsAt?: Date | string | number | null | undefined,
  locale?: string | null
): string {
  if (!startsAt) return "";
  const s = typeof startsAt === "object" ? startsAt : new Date(startsAt);
  if (isNaN(s.getTime())) return "";

  const datePart = formatEventDate(s, locale, {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  const startTime = formatEventTime(s, locale);

  if (endsAt) {
    const e = typeof endsAt === "object" ? endsAt : new Date(endsAt);
    if (!isNaN(e.getTime())) {
      const endTime = formatEventTime(e, locale);
      return `${datePart}, ${startTime} – ${endTime}`;
    }
  }

  return `${datePart}, ${startTime}`;
}
