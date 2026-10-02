/**
 * Utilities for error sanitization and safe external async operations (timeouts).
 */

/**
 * Common business error code patterns that are safe to return to the client.
 * e.g., "AUTH_REQUIRED", "EVENT_NOT_FOUND", "INSUFFICIENT_CREDITS", "INVALID_INPUT"
 */
const SAFE_CODE_REGEX = /^[A-Z0-9_]{3,64}$/;

/**
 * Patterns in error messages that indicate internal database / SQL / server leaks.
 */
const RAW_DB_LEAK_PATTERNS = [
  /select /i,
  /insert into/i,
  /update /i,
  /delete from/i,
  /relation ".*" does not exist/i,
  /column ".*" of relation/i,
  /syntax error at or near/i,
  /violates.*constraint/i,
  /duplicate key value/i,
  /foreign key/i,
  /connection.*refused/i,
  /pg_/i,
  /drizzle/i,
  /postgres/i,
  /ECONNREFUSED/i,
  /ETIMEDOUT/i,
];

/**
 * Sanitizes an error so that raw SQL/database or internal driver stack details
 * are never exposed to the client.
 * 
 * If the error is a recognized domain code (e.g. "AUTH_REQUIRED", "EVENT_FULL") or a clean
 * user-facing validation message, it is preserved. Otherwise, it returns the safe fallback.
 */
export function sanitizeErrorMessage(
  err: unknown,
  fallbackMessage: string = "An unexpected error occurred. Please try again."
): string {
  if (!err) return fallbackMessage;

  const raw = typeof err === "string" ? err : (err as any)?.message;
  if (!raw || typeof raw !== "string") return fallbackMessage;

  const trimmed = raw.trim();

  // If it matches a standard UPPER_SNAKE_CASE business error code, return it as-is
  if (SAFE_CODE_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Check if it contains any DB / internal leakage patterns
  for (const pattern of RAW_DB_LEAK_PATTERNS) {
    if (pattern.test(trimmed)) {
      return fallbackMessage;
    }
  }

  // If the message is excessively long or contains stack traces / paths, return fallback
  if (trimmed.length > 200 || trimmed.includes(" at ") || trimmed.includes("node_modules")) {
    return fallbackMessage;
  }

  return trimmed;
}

/**
 * Wraps a promise with a hard timeout to prevent hanging external API requests
 * (such as Stripe, Brevo, Supabase Storage, etc.) from piling up.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  operationName: string = "Operation"
): Promise<T> {
  let timer: NodeJS.Timeout | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
