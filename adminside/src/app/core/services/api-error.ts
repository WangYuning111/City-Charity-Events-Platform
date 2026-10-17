import { HttpErrorResponse } from '@angular/common/http';

/**
 * Normalises an HttpErrorResponse into a single actionable message.
 *
 * The API answers with { success:false, message, errors? }; field-level
 * errors are preferred because they tell staff exactly what to fix.
 */
export function extractApiError(
  err: unknown,
  fallback = 'Something went wrong. Please try again.'
): string {
  const httpErr = err as HttpErrorResponse;
  if (!httpErr || typeof httpErr !== 'object') return fallback;

  if (httpErr.status === 0) {
    return 'Cannot reach the API server. Please make sure the Node API is running on port 3000.';
  }

  const body = httpErr.error as
    | { message?: string; errors?: string[]; registration_count?: number; tickets_sold?: number }
    | string
    | null;

  if (typeof body === 'string' && body.trim()) return body;

  if (body && typeof body === 'object') {
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      return body.errors.join(' • ');
    }
    if (typeof body.message === 'string' && body.message.trim()) {
      if (body.registration_count) {
        return `${body.message} (${body.registration_count} registration(s), ${body.tickets_sold ?? 0} ticket(s))`;
      }
      return body.message;
    }
  }

  return fallback;
}
