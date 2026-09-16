import type { DiscogsRateLimitInfo } from '../utils/rateLimit';

export interface HttpClient {
  request<T>(
    endpoint: string,
    options?: RequestInit,
    body?: unknown,
  ): Promise<T>;
  /** Optional: last observed Discogs rate-limit headers (DefaultHttpClient). */
  getLastRateLimitInfo?(): DiscogsRateLimitInfo | null;
}
