/**
 * Unwraps an edenTreaty response into its data, throwing a real Error on
 * failure. Shared so every API module surfaces errors consistently.
 *
 * edenTreaty wraps HTTP errors as `{ status, value }` where `value` is the
 * JSON body (`{ error, message }`). The earlier inline unwraps read
 * `error.message` (the wrong level) and rendered `[object Object]` - this
 * pulls the message out of whatever shape is present.
 */
function errorMessage(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'Request failed';
  const e = error as Record<string, unknown>;
  const value = e.value as Record<string, unknown> | undefined;
  if (value && typeof value.message === 'string') return value.message;
  if (typeof e.message === 'string') return e.message;
  return 'Request failed';
}

export function unwrap<T>(value: { data: T | null; error: unknown }): T {
  if (value.error) {
    throw new Error(errorMessage(value.error));
  }
  if (value.data === null) throw new Error('Empty response');
  return value.data;
}
