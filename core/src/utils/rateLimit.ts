/**
 * Discogs rate-limit helpers (Workers-safe: no Node-only APIs).
 *
 * Discogs sends:
 * - X-Discogs-Ratelimit
 * - X-Discogs-Ratelimit-Used
 * - X-Discogs-Ratelimit-Remaining
 * and may send Retry-After / 429 when the limit is exceeded.
 */

export interface DiscogsRateLimitInfo {
  /** Max requests allowed in the current window. */
  limit: number | null;
  /** Requests already used in the current window. */
  used: number | null;
  /** Requests remaining in the current window. */
  remaining: number | null;
  /** Seconds to wait before retrying (from Retry-After), if provided. */
  retryAfterSeconds: number | null;
}

export interface RateLimitOptions {
  /** Max retries after a 429 (or near-limit wait). Default: 3 */
  maxRetries?: number;
  /**
   * When remaining requests are at or below this value, wait before the
   * next request. Default: 1
   */
  nearLimitThreshold?: number;
  /** Honor Retry-After when present. Default: true */
  respectRetryAfter?: boolean;
  /** Floor for exponential backoff (ms). Default: 500 */
  minBackoffMs?: number;
  /** Cap for backoff (ms). Default: 60_000 (Discogs window is ~1 minute) */
  maxBackoffMs?: number;
  /**
   * Assumed rate-limit window length when Retry-After is absent (ms).
   * Default: 60_000
   */
  windowMs?: number;
}

export const DEFAULT_RATE_LIMIT_OPTIONS: Required<RateLimitOptions> = {
  maxRetries: 3,
  nearLimitThreshold: 1,
  respectRetryAfter: true,
  minBackoffMs: 500,
  maxBackoffMs: 60_000,
  windowMs: 60_000,
};

const HEADER_LIMIT = 'x-discogs-ratelimit';
const HEADER_USED = 'x-discogs-ratelimit-used';
const HEADER_REMAINING = 'x-discogs-ratelimit-remaining';
const HEADER_RETRY_AFTER = 'retry-after';

function parsePositiveInt(value: string | null): number | null {
  if (value == null || value === '') return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Parse Discogs rate-limit (+ Retry-After) headers from a Fetch Response.
 */
export function parseRateLimitHeaders(headers: Headers): DiscogsRateLimitInfo {
  return {
    limit: parsePositiveInt(headers.get(HEADER_LIMIT)),
    used: parsePositiveInt(headers.get(HEADER_USED)),
    remaining: parsePositiveInt(headers.get(HEADER_REMAINING)),
    retryAfterSeconds: parsePositiveInt(headers.get(HEADER_RETRY_AFTER)),
  };
}

/**
 * Workers-safe delay (uses setTimeout / Promise — available in Workers).
 */
export function sleep(ms: number): Promise<void> {
  const delay = Math.max(0, ms);
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

/**
 * Compute how long to wait before retrying after a 429 / exhausted window.
 */
export function computeBackoffMs(
  info: DiscogsRateLimitInfo,
  attempt: number,
  options: Required<RateLimitOptions> = DEFAULT_RATE_LIMIT_OPTIONS,
): number {
  if (
    options.respectRetryAfter &&
    info.retryAfterSeconds != null &&
    info.retryAfterSeconds > 0
  ) {
    return Math.min(info.retryAfterSeconds * 1000, options.maxBackoffMs);
  }

  // No remaining quota → wait for a full window (or capped exponential).
  if (info.remaining === 0) {
    return Math.min(options.windowMs, options.maxBackoffMs);
  }

  const exp = options.minBackoffMs * 2 ** Math.max(0, attempt);
  return Math.min(exp, options.maxBackoffMs);
}

/**
 * Pre-request delay when prior response indicated we are near / at the limit.
 */
export function computeNearLimitDelayMs(
  info: DiscogsRateLimitInfo | null,
  options: Required<RateLimitOptions> = DEFAULT_RATE_LIMIT_OPTIONS,
): number {
  if (!info || info.remaining == null) return 0;
  if (info.remaining > options.nearLimitThreshold) return 0;

  if (
    options.respectRetryAfter &&
    info.retryAfterSeconds != null &&
    info.retryAfterSeconds > 0
  ) {
    return Math.min(info.retryAfterSeconds * 1000, options.maxBackoffMs);
  }

  // Remaining at/below threshold: wait a slice of the window so callers
  // avoid an immediate 429. Full window when remaining is 0.
  if (info.remaining === 0) {
    return Math.min(options.windowMs, options.maxBackoffMs);
  }

  return Math.min(
    Math.ceil(options.windowMs / Math.max(info.remaining + 1, 2)),
    options.maxBackoffMs,
  );
}

export function mergeRateLimitOptions(
  overrides?: RateLimitOptions,
): Required<RateLimitOptions> {
  return { ...DEFAULT_RATE_LIMIT_OPTIONS, ...overrides };
}
