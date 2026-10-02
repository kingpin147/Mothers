import { describe, it, expect } from 'vitest';
import { sanitizeErrorMessage, withTimeout } from '@/lib/errors';

describe('Error Sanitization and Timeout Utilities', () => {
  it('should preserve standard business error codes', () => {
    expect(sanitizeErrorMessage(new Error('AUTH_REQUIRED'))).toBe('AUTH_REQUIRED');
    expect(sanitizeErrorMessage(new Error('EVENT_NOT_FOUND'))).toBe('EVENT_NOT_FOUND');
    expect(sanitizeErrorMessage(new Error('INSUFFICIENT_CREDITS'))).toBe('INSUFFICIENT_CREDITS');
    expect(sanitizeErrorMessage(new Error('INVALID_INPUT'))).toBe('INVALID_INPUT');
  });

  it('should sanitize raw Postgres and Drizzle DB error messages', () => {
    const rawPgError = new Error('error: duplicate key value violates unique constraint "users_email_unique"');
    expect(sanitizeErrorMessage(rawPgError, 'CUSTOM_FALLBACK')).toBe('CUSTOM_FALLBACK');

    const relationError = new Error('relation "event_waitlist" does not exist at character 15');
    expect(sanitizeErrorMessage(relationError)).toBe('An unexpected error occurred. Please try again.');

    const sqlSyntaxError = new Error('syntax error at or near "SELECT" at line 1');
    expect(sanitizeErrorMessage(sqlSyntaxError)).toBe('An unexpected error occurred. Please try again.');
  });

  it('withTimeout should resolve before timeout', async () => {
    const fastPromise = new Promise((resolve) => setTimeout(() => resolve('ok'), 50));
    const result = await withTimeout(fastPromise, 200, 'FastOperation');
    expect(result).toBe('ok');
  });

  it('withTimeout should reject when timeout is exceeded', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(() => resolve('slow'), 300));
    await expect(withTimeout(slowPromise, 50, 'SlowOperation')).rejects.toThrow(
      'SlowOperation timed out after 50ms'
    );
  });
});
