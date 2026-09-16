import type { DiscogsRateLimitInfo } from './rateLimit';

export class DiscogsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'DiscogsError';
    // Maintain instanceof across bundlers / transpile targets
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when Discogs rate limits are exceeded and retries are exhausted
 * (or retries are disabled). Carries typed header metadata for Workers callers.
 */
export class RateLimitError extends DiscogsError {
  public readonly status: number;
  public readonly rateLimit: DiscogsRateLimitInfo;

  constructor(
    message: string,
    rateLimit: DiscogsRateLimitInfo,
    options?: {
      status?: number;
      originalError?: unknown;
    },
  ) {
    super(message, ErrorCodes.RATE_LIMIT_ERROR, options?.originalError);
    this.name = 'RateLimitError';
    this.status = options?.status ?? 429;
    this.rateLimit = rateLimit;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const ErrorCodes = {
  STORAGE_ERROR: 'STORAGE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  INVALID_TOKEN: 'INVALID_TOKEN',
  CONFIGURATION_ERROR: 'CONFIGURATION_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export function isRateLimitError(error: unknown): error is RateLimitError {
  if (error instanceof RateLimitError) return true;
  // Duck-type for bundlers / test runners that can duplicate the class identity.
  if (typeof error !== 'object' || error === null) return false;
  const e = error as { name?: string; code?: string; rateLimit?: unknown };
  return (
    e.name === 'RateLimitError' &&
    e.code === ErrorCodes.RATE_LIMIT_ERROR &&
    typeof e.rateLimit === 'object' &&
    e.rateLimit !== null
  );
}
