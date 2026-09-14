/**
 * Helper to get the canonical application base URL without local fallback.
 */
export function getAppUrl(): string {
  const url = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "https://themothers.cc";
  return url.replace(/\/+$/, "");
}
