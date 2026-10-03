import { headers } from "next/headers";

/**
 * In-Memory Sliding Window Rate Limiter
 * 
 * Provides rate limiting protection for sensitive endpoints:
 * - Sign in (brute-force protection)
 * - Sign up / Account creation
 * - Password reset requests & completion
 * - Gazette posting and replies
 */

interface RateLimitRecord {
  timestamps: number[];
  blockedUntil?: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Periodic cleanup every 5 minutes to prevent memory bloat
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 24 * 60 * 60 * 1000);
      if (record.timestamps.length === 0 && (!record.blockedUntil || record.blockedUntil < now)) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  blockDurationMs?: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetMs: number;
  retryAfterSeconds?: number;
  error?: string;
}

/**
 * Check and record a rate limit hit for a given key.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const { limit, windowMs, blockDurationMs } = options;

  let record = memoryStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    memoryStore.set(key, record);
  }

  // Check if currently blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetMs: record.blockedUntil - now,
      retryAfterSeconds,
      error: `Too many attempts. Please try again in ${retryAfterSeconds} seconds.`,
    };
  }

  // Clean timestamps outside the current window
  const windowStart = now - windowMs;
  record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

  if (record.timestamps.length >= limit) {
    if (blockDurationMs) {
      record.blockedUntil = now + blockDurationMs;
    }
    const oldest = record.timestamps[0] || now;
    const resetMs = Math.max(0, oldest + windowMs - now);
    const retryAfterSeconds = Math.ceil(resetMs / 1000);

    return {
      success: false,
      remaining: 0,
      resetMs,
      retryAfterSeconds,
      error: `Too many attempts. Please try again in ${retryAfterSeconds} seconds.`,
    };
  }

  // Record this attempt
  record.timestamps.push(now);

  return {
    success: true,
    remaining: Math.max(0, limit - record.timestamps.length),
    resetMs: windowMs,
  };
}

/**
 * Helper to safely extract client IP from incoming request headers
 */
export async function getClientIp(): Promise<string> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0]?.trim() || "127.0.0.1";
    }
    return (
      h.get("x-real-ip") ||
      h.get("cf-connecting-ip") ||
      h.get("true-client-ip") ||
      "127.0.0.1"
    );
  } catch {
    return "127.0.0.1";
  }
}

// ─── SPECIALIZED RATE LIMITERS ──────────────────────────────────────────────

/**
 * Sign In Rate Limiter
 * - Max 5 attempts per 60 seconds
 * - Max 15 attempts per 15 minutes
 */
export function checkSignInRateLimit(identifier: string): RateLimitResult {
  // Short burst limit: 5 in 1 minute
  const burst = checkRateLimit(`signin:burst:${identifier}`, {
    limit: 5,
    windowMs: 60 * 1000,
    blockDurationMs: 60 * 1000,
  });
  if (!burst.success) return burst;

  // Sustained limit: 15 in 15 minutes
  return checkRateLimit(`signin:sustained:${identifier}`, {
    limit: 15,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  });
}

/**
 * Sign Up / Account Creation Rate Limiter
 * - Max 5 signups per 15 minutes per IP
 */
export function checkSignUpRateLimit(ip: string): RateLimitResult {
  return checkRateLimit(`signup:${ip}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
  });
}

/**
 * Password Reset Request Rate Limiter
 * - Max 3 requests per 15 minutes per email/IP
 */
export function checkPasswordResetRequestRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(`pwd_reset_req:${identifier}`, {
    limit: 3,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
  });
}

/**
 * Password Reset Completion Rate Limiter
 * - Max 5 completion attempts per 15 minutes
 */
export function checkPasswordResetCompleteRateLimit(identifier: string): RateLimitResult {
  return checkRateLimit(`pwd_reset_comp:${identifier}`, {
    limit: 5,
    windowMs: 15 * 60 * 1000,
    blockDurationMs: 15 * 60 * 1000,
  });
}

/**
 * Gazette Post Rate Limiter
 * - Min 30 seconds gap between posts
 * - Max 5 posts per 24 hours
 */
export function checkGazettePostRateLimit(personId: string): RateLimitResult {
  // 30s cooldown
  const cooldown = checkRateLimit(`gazette:cooldown:post:${personId}`, {
    limit: 1,
    windowMs: 30 * 1000,
  });
  if (!cooldown.success) {
    return {
      success: false,
      remaining: 0,
      resetMs: cooldown.resetMs,
      retryAfterSeconds: cooldown.retryAfterSeconds,
      error: "Please wait 30 seconds before publishing another post.",
    };
  }

  // Daily limit
  return checkRateLimit(`gazette:daily:post:${personId}`, {
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000,
  });
}

/**
 * Gazette Reply Rate Limiter
 * - Min 30 seconds gap between replies
 * - Max 20 replies per 24 hours
 */
export function checkGazetteReplyRateLimit(personId: string): RateLimitResult {
  // 30s cooldown
  const cooldown = checkRateLimit(`gazette:cooldown:reply:${personId}`, {
    limit: 1,
    windowMs: 30 * 1000,
  });
  if (!cooldown.success) {
    return {
      success: false,
      remaining: 0,
      resetMs: cooldown.resetMs,
      retryAfterSeconds: cooldown.retryAfterSeconds,
      error: "Please wait 30 seconds before posting another reply.",
    };
  }

  // Daily limit
  return checkRateLimit(`gazette:daily:reply:${personId}`, {
    limit: 20,
    windowMs: 24 * 60 * 60 * 1000,
  });
}
