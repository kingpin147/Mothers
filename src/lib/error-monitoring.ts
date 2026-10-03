import { logError } from "@/lib/logger";

/**
 * Unified Error Monitoring & Sentry Integration Module
 *
 * Automatically reports errors to:
 * 1. The PostgreSQL `error_log` table (visible in Admin & Super Admin)
 * 2. Sentry (when SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN is configured)
 * 3. Structured standard output in development and production
 */

export interface ErrorContext {
  userId?: string;
  userEmail?: string;
  path?: string;
  source?: string;
  action?: string;
  tags?: Record<string, string | number | boolean>;
  extra?: Record<string, any>;
  [key: string]: any;
}

/**
 * Send an error payload to Sentry if a DSN is present
 */
async function sendToSentry(error: Error | string, context?: ErrorContext) {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  try {
    // Parse DSN: https://<key>@<host>/<projectId>
    const url = new URL(dsn);
    const key = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    if (!key || !projectId) return;

    const endpoint = `${url.protocol}//${url.host}/api/${projectId}/store/`;
    const message = typeof error === "string" ? error : error.message;
    const stack = typeof error === "string" ? undefined : error.stack;

    const payload = {
      event_id: Math.random().toString(36).substring(2) + Date.now().toString(36),
      timestamp: new Date().toISOString(),
      platform: "javascript",
      level: "error",
      message,
      environment: process.env.NODE_ENV || "development",
      exception: {
        values: [
          {
            type: typeof error === "string" ? "Error" : error.name || "Error",
            value: message,
            stacktrace: stack ? { frames: [{ filename: stack }] } : undefined,
          },
        ],
      },
      user: context?.userId ? { id: context.userId, email: context.userEmail } : undefined,
      tags: {
        source: context?.source || "app",
        action: context?.action,
        ...context?.tags,
      },
      extra: context?.extra,
    };

    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=themothers-monitoring/1.0`,
      },
      body: JSON.stringify(payload),
    }).catch(() => {});
  } catch {
    // Failsafe so Sentry sending never crashes application
  }
}

/**
 * Capture an exception in any server action, route handler, or server component
 */
export async function captureException(
  error: unknown,
  context?: ErrorContext
): Promise<void> {
  const source = context?.source || "app";
  const errObj = error instanceof Error ? error : new Error(String(error));

  // 1. Write to database error_log table
  await logError(source, errObj.message, errObj, {
    ...context,
    timestamp: new Date().toISOString(),
  });

  // 2. Transmit to external monitoring (Sentry if configured)
  await sendToSentry(errObj, context);
}

/**
 * Capture an informational or warning message in error monitoring
 */
export async function captureMessage(
  message: string,
  level: "info" | "warning" | "error" = "info",
  context?: ErrorContext
): Promise<void> {
  const source = context?.source || "app";
  await logError(`${source}:${level}`, message, undefined, context);
  if (level === "error") {
    await sendToSentry(message, context);
  }
}

/**
 * Higher-order wrapper to safely execute server actions with automated error logging
 */
export function withErrorMonitoring<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  actionName: string
) {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (err: any) {
      await captureException(err, {
        source: "server_action",
        action: actionName,
        args: process.env.NODE_ENV === "development" ? args : undefined,
      });
      throw err;
    }
  };
}
