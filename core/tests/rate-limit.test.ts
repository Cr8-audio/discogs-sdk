import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DefaultHttpClient } from '../src/implementations/DefaultHttpClient';
import { ErrorCodes, isRateLimitError } from '../src/utils/errors';
import {
  parseRateLimitHeaders,
  computeBackoffMs,
  computeNearLimitDelayMs,
  DEFAULT_RATE_LIMIT_OPTIONS,
} from '../src/utils/rateLimit';

function jsonResponse(
  body: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: new Headers({
      'Content-Type': 'application/json',
      ...init.headers,
    }),
  });
}

const RATE_HEADERS_FULL = {
  'X-Discogs-Ratelimit': '60',
  'X-Discogs-Ratelimit-Used': '60',
  'X-Discogs-Ratelimit-Remaining': '0',
  'Retry-After': '1',
};

describe('rateLimit helpers', () => {
  it('parses Discogs rate-limit headers and Retry-After', () => {
    expect(
      parseRateLimitHeaders(
        new Headers({
          'X-Discogs-Ratelimit': '60',
          'X-Discogs-Ratelimit-Used': '58',
          'X-Discogs-Ratelimit-Remaining': '2',
          'Retry-After': '30',
        }),
      ),
    ).toEqual({
      limit: 60,
      used: 58,
      remaining: 2,
      retryAfterSeconds: 30,
    });
  });

  it('prefers Retry-After for backoff; uses window when remaining is 0', () => {
    expect(
      computeBackoffMs(
        { limit: 60, used: 60, remaining: 0, retryAfterSeconds: 12 },
        0,
      ),
    ).toBe(12_000);
    expect(
      computeBackoffMs(
        { limit: 60, used: 60, remaining: 0, retryAfterSeconds: null },
        0,
      ),
    ).toBe(DEFAULT_RATE_LIMIT_OPTIONS.windowMs);
  });

  it('computes near-limit delay only when remaining is low', () => {
    expect(
      computeNearLimitDelayMs({
        limit: 60,
        used: 59,
        remaining: 1,
        retryAfterSeconds: null,
      }),
    ).toBeGreaterThan(0);
    expect(
      computeNearLimitDelayMs({
        limit: 60,
        used: 10,
        remaining: 50,
        retryAfterSeconds: null,
      }),
    ).toBe(0);
  });
});

describe('DefaultHttpClient rate-limit handling', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('records rate-limit metadata from successful responses', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { ok: true },
        {
          headers: {
            'X-Discogs-Ratelimit': '60',
            'X-Discogs-Ratelimit-Used': '5',
            'X-Discogs-Ratelimit-Remaining': '55',
          },
        },
      ),
    );
    const client = new DefaultHttpClient('https://api.discogs.com', 'Test/1.0', {
      maxRetries: 0,
    });
    await client.request('/database/search?q=test');
    expect(client.getLastRateLimitInfo()).toEqual({
      limit: 60,
      used: 5,
      remaining: 55,
      retryAfterSeconds: null,
    });
  });

  it('retries on 429 using Retry-After then succeeds', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { message: 'slow down' },
          { status: 429, headers: RATE_HEADERS_FULL },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { results: [] },
          {
            headers: {
              'X-Discogs-Ratelimit': '60',
              'X-Discogs-Ratelimit-Used': '1',
              'X-Discogs-Ratelimit-Remaining': '59',
            },
          },
        ),
      );
    const client = new DefaultHttpClient('https://api.discogs.com', 'Test/1.0', {
      maxRetries: 2,
      nearLimitThreshold: -1,
    });
    const pending = client.request<{ results: unknown[] }>(
      '/database/search?q=x',
    );
    await vi.advanceTimersByTimeAsync(1000);
    expect(await pending).toEqual({ results: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws RateLimitError with metadata when retries are exhausted', async () => {
    fetchMock.mockImplementation(async () =>
      jsonResponse(
        { message: 'Rate limit exceeded' },
        { status: 429, headers: RATE_HEADERS_FULL },
      ),
    );
    const client = new DefaultHttpClient('https://api.discogs.com', 'Test/1.0', {
      maxRetries: 0,
      nearLimitThreshold: -1,
    });
    await expect(client.request('/oauth/identity')).rejects.toMatchObject({
      name: 'RateLimitError',
      code: ErrorCodes.RATE_LIMIT_ERROR,
      status: 429,
      rateLimit: {
        limit: 60,
        used: 60,
        remaining: 0,
        retryAfterSeconds: 1,
      },
    });
    const thrown = await client.request('/oauth/identity').then(
      () => null,
      (e: unknown) => e,
    );
    expect(isRateLimitError(thrown)).toBe(true);
  });

  it('waits when prior response was near the limit before next request', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(
          { a: 1 },
          {
            headers: {
              'X-Discogs-Ratelimit': '60',
              'X-Discogs-Ratelimit-Used': '60',
              'X-Discogs-Ratelimit-Remaining': '0',
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponse(
          { b: 2 },
          {
            headers: {
              'X-Discogs-Ratelimit': '60',
              'X-Discogs-Ratelimit-Used': '1',
              'X-Discogs-Ratelimit-Remaining': '59',
            },
          },
        ),
      );
    const client = new DefaultHttpClient('https://api.discogs.com', 'Test/1.0', {
      nearLimitThreshold: 1,
      windowMs: 60_000,
      maxRetries: 0,
    });
    await client.request('/one');
    const second = client.request('/two');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    await expect(second).resolves.toEqual({ b: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
