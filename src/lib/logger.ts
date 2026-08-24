import { db } from "@/db";
import { errorLog } from "@/db/schema";

/**
 * Global Error Logger
 * 
 * Writes errors to the `error_log` database table for display in the Super Admin dashboard.
 */
export async function logError(
  source: string,
  message: string,
  error?: any,
  context?: Record<string, any>
) {
  try {
    let stackTrace = undefined;
    
    if (error instanceof Error) {
      stackTrace = error.stack;
      message = `${message} — ${error.message}`;
    } else if (typeof error === "string") {
      message = `${message} — ${error}`;
    } else if (error) {
      message = `${message} — ${JSON.stringify(error)}`;
    }

    await db.insert(errorLog).values({
      source,
      message,
      stackTrace,
      context: context || null,
    });
    
    // Also log to console in development
    if (process.env.NODE_ENV !== "production") {
      console.error(`[${source}] ${message}`, error, context);
    }
  } catch (loggingError) {
    // Failsafe so the logger itself doesn't crash the app
    console.error("FATAL: Failed to write to error_log table", loggingError);
  }
}
