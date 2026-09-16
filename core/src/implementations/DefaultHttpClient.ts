import { HttpClient } from '../interfaces/http';
import { DiscogsError, ErrorCodes, RateLimitError } from '../utils/errors';
import {
  DiscogsRateLimitInfo,
  RateLimitOptions,
  computeBackoffMs,
  computeNearLimitDelayMs,
  mergeRateLimitOptions,
  parseRateLimitHeaders,
  sleep,
} from '../utils/rateLimit';

export type { RateLimitOptions, DiscogsRateLimitInfo };

export class DefaultHttpClient implements HttpClient {
  private readonly rateLimitOptions: Required<RateLimitOptions>;
  private lastRateLimit: DiscogsRateLimitInfo | null = null;

  constructor(
    private readonly baseUrl: string,
    private readonly userAgent: string,
    rateLimitOptions?: RateLimitOptions,
  ) {
    this.rateLimitOptions = mergeRateLimitOptions(rateLimitOptions);
  }

  getLastRateLimitInfo(): DiscogsRateLimitInfo | null {
    return this.lastRateLimit;
  }

  async request<T>(
    endpoint: string,
    options?: RequestInit,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    let attempt = 0;

    while (true) {
      // Avoid stacking near-limit wait on top of a 429 backoff.
      if (attempt === 0) {
        const nearDelay = computeNearLimitDelayMs(
          this.lastRateLimit,
          this.rateLimitOptions,
        );
        if (nearDelay > 0) {
          await sleep(nearDelay);
        }
      }

      try {
        const headers = new Headers(options?.headers);
        headers.set('User-Agent', this.userAgent);

        const requestOptions: RequestInit = {
          ...options,
          headers,
          body: body as BodyInit | null | undefined,
        };

        const response = await fetch(url, requestOptions);
        const rateLimit = parseRateLimitHeaders(response.headers);
        this.lastRateLimit = rateLimit;

        const responseText = await response.text();

        if (response.status === 429) {
          if (attempt >= this.rateLimitOptions.maxRetries) {
            throw new RateLimitError(
              `Discogs rate limit exceeded after ${attempt} retries: ${responseText}`,
              rateLimit,
              { status: 429 },
            );
          }

          const backoff = computeBackoffMs(
            rateLimit,
            attempt,
            this.rateLimitOptions,
          );
          attempt += 1;
          await sleep(backoff);
          continue;
        }

        if (!response.ok) {
          throw new DiscogsError(
            `HTTP error ${response.status}: ${responseText}`,
            ErrorCodes.NETWORK_ERROR,
          );
        }

        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('application/json')) {
          return JSON.parse(responseText) as T;
        }
        if (contentType.includes('application/x-www-form-urlencoded')) {
          const params = new URLSearchParams(responseText);
          const result: Record<string, string> = {};
          params.forEach((value, key) => {
            result[key] = value;
          });
          return result as unknown as T;
        }
        return responseText as unknown as T;
      } catch (error) {
        if (error instanceof DiscogsError) {
          throw error;
        }
        throw new DiscogsError(
          error instanceof Error ? error.message : 'Unknown error',
          ErrorCodes.NETWORK_ERROR,
          error,
        );
      }
    }
  }
}
