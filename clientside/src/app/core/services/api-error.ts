import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns an HttpErrorResponse into a message a human can act on.
 *
 * The API consistently answers with either:
 *   { success: false, message: '...' }
 *   { success: false, message: 'Validation failed', errors: ['...', '...'] }
 * so we prefer the field-level errors, then the general message, then a
 * network-specific hint when the request never reached the server at all.
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
    | { message?: string; errors?: string[] }
    | string
    | null;

  if (typeof body === 'string' && body.trim()) return body;

  if (body && typeof body === 'object') {
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      return body.errors.join(' • ');
    }
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
  }

  return fallback;
}
