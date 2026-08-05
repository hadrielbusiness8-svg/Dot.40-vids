export const SHORT_MIN_SECONDS = 10;
export const SHORT_MAX_SECONDS = 120;
export const LONG_MIN_SECONDS = 180;

// Returns { kind: 'short' | 'long' | 'invalid', message?: string }
export function classifyDuration(seconds) {
  if (!seconds || Number.isNaN(seconds) || seconds <= 0) {
    return { kind: 'invalid', message: 'Waiting for video duration…' };
  }
  if (seconds < SHORT_MIN_SECONDS) {
    return { kind: 'invalid', message: `Too short — videos must be at least ${SHORT_MIN_SECONDS} seconds.` };
  }
  if (seconds > SHORT_MAX_SECONDS && seconds < LONG_MIN_SECONDS) {
    return {
      kind: 'invalid',
      message: `Videos between 2 and 3 minutes aren't supported. Trim to under 2 minutes for a Short, or extend to 3 minutes or more.`
    };
  }
  if (seconds <= SHORT_MAX_SECONDS) {
    return { kind: 'short', message: 'This will publish as a Short.' };
  }
  return { kind: 'long', message: 'This will publish as a full video.' };
}
