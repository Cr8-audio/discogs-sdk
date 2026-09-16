import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DiscogsSDK, MemoryStorageAdapter, Search } from '../src';
import { BaseImplementation } from '../src/base';
import { MockHttpClient } from './__mocks__/mockHttpClient';
import { MockStorageAdapter } from './__mocks__/mockStorage';
import { createTestConfig } from './helpers/setup';

/**
 * Regression coverage for the defects fixed in 3.0.0. Each block names the
 * behaviour that used to be wrong so a future refactor can't quietly undo it.
 */
describe('3.0.0 regressions', () => {
  describe('DiscogsSDK custom dependencies', () => {
    const config = {
      DiscogsConsumerKey: 'key',
      DiscogsConsumerSecret: 'secret',
    };

    it('withCustomStorage wires the adapter into every resource', async () => {
      // Previously the statics reassigned `base` AFTER auth/collection/search/
      // user had been constructed, so the custom adapter was silently ignored.
      const storage = new MockStorageAdapter();
      const sdk = DiscogsSDK.withCustomStorage(config, storage);

      expect(sdk.auth.base.getStorage()).toBe(storage);
      expect(sdk.search.base.getStorage()).toBe(storage);

      await sdk.auth.base.getTokenManager().setAccessToken('written-through');
      expect(await storage.getItem('accessToken')).toBe('written-through');
    });

    it('withCustomDependencies wires the injected http client into resources', async () => {
      const httpClient = new MockHttpClient();
      const storage = new MockStorageAdapter();
      const sdk = DiscogsSDK.withCustomDependencies(
        createTestConfig({ httpClient, storage }),
      );

      expect(sdk.auth.base.getHttpClient()).toBe(httpClient);
      expect(sdk.search.base.getHttpClient()).toBe(httpClient);
    });

    it('the default constructor still builds working defaults', () => {
      const sdk = new DiscogsSDK(config);
      expect(sdk.auth.base.getStorage()).toBeInstanceOf(MemoryStorageAdapter);
    });
  });

  describe('MemoryStorageAdapter', () => {
    it('honours the async StorageAdapter contract', async () => {
      // getItem used to return the raw value synchronously, so `await`ing a
      // miss produced `undefined` instead of the documented `null`.
      const storage = new MemoryStorageAdapter();

      const miss = storage.getItem('nope');
      expect(miss).toBeInstanceOf(Promise);
      expect(await miss).toBeNull();

      await storage.setItem('key', 'value');
      expect(await storage.getItem('key')).toBe('value');

      await storage.removeItem('key');
      expect(await storage.getItem('key')).toBeNull();

      await storage.setItem('again', 'value');
      await storage.clear();
      expect(await storage.getItem('again')).toBeNull();
    });
  });

  describe('Search authorization', () => {
    let httpClient: MockHttpClient;
    let storage: MockStorageAdapter;
    let search: Search;

    beforeEach(() => {
      httpClient = new MockHttpClient();
      storage = new MockStorageAdapter();
      vi.spyOn(console, 'warn').mockImplementation(() => {});

      search = new Search(
        new BaseImplementation(createTestConfig({ httpClient, storage })),
      );
      httpClient.setMockResponse('database/search', {
        ok: true,
        status: 200,
        data: {
          pagination: { per_page: 50, pages: 0, page: 1, items: 0, urls: {} },
          results: [],
        },
      });
    });

    it('signs with the access token secret, not the request token secret', async () => {
      // The old implementation paired the ACCESS token with the REQUEST token
      // secret, producing a signature Discogs rejects.
      await storage.setItem('accessToken', 'access-token');
      await storage.setItem('accessTokenSecret', 'access-secret');
      await storage.setItem('requestTokenSecret', 'request-secret');

      await search.getSearchResults({ query: 'test' });

      const auth = httpClient.getLastRequest()?.headers?.authorization ?? '';
      expect(auth).toContain('OAuth');
      expect(auth).toContain('oauth_token="access-token"');
      expect(auth).toContain('oauth_signature="test-secret&access-secret"');
      expect(auth).not.toContain('request-secret');
    });

    it('falls back to Basic auth when unauthenticated', async () => {
      await search.getSearchResults({ query: 'test' });

      const auth = httpClient.getLastRequest()?.headers?.authorization ?? '';
      expect(auth).toMatch(/^Basic /);
      expect(console.warn).toHaveBeenCalled();
    });

    it('maps perPage/page onto Discogs query keys and drops undefined values', async () => {
      await search.getSearchResults({
        query: 'rush',
        page: 2,
        perPage: 25,
        country: undefined,
      });

      const params = new URLSearchParams(
        (httpClient.getLastRequest()?.url ?? '').split('?')[1],
      );
      expect(params.get('q')).toBe('rush');
      expect(params.get('page')).toBe('2');
      expect(params.get('per_page')).toBe('25');
      expect(params.has('country')).toBe(false);
      expect(params.has('perPage')).toBe(false);
    });
  });

  describe('Base.request header handling', () => {
    it('preserves caller-supplied headers instead of replacing them', async () => {
      // request() used to build a fresh Headers object and drop `options.headers`
      // entirely, discarding Content-Length and any caller-resolved auth.
      const httpClient = new MockHttpClient();
      const base = new BaseImplementation(createTestConfig({ httpClient }));
      httpClient.setMockResponse('some/endpoint', {
        ok: true,
        status: 200,
        data: {},
      });

      await base.requestPublic('some/endpoint', {
        method: 'POST',
        headers: {
          Authorization: 'Basic caller-supplied',
          'Content-Length': '0',
          'X-Custom': 'kept',
        },
      });

      const headers = httpClient.getLastRequest()?.headers ?? {};
      expect(headers.authorization).toBe('Basic caller-supplied');
      expect(headers['content-length']).toBe('0');
      expect(headers['x-custom']).toBe('kept');
    });

    it('supplies an OAuth header only when the caller did not', async () => {
      const httpClient = new MockHttpClient();
      const storage = new MockStorageAdapter();
      const base = new BaseImplementation(
        createTestConfig({ httpClient, storage }),
      );
      await storage.setItem('accessToken', 'tok');
      await storage.setItem('accessTokenSecret', 'sec');
      httpClient.setMockResponse('some/endpoint', {
        ok: true,
        status: 200,
        data: {},
      });

      await base.requestPublic('some/endpoint', { method: 'GET' });

      const auth = httpClient.getLastRequest()?.headers?.authorization ?? '';
      expect(auth).toContain('oauth_token="tok"');
    });
  });

  describe('package root stays edge-safe', () => {
    it('does not re-export NodeAuth', async () => {
      // NodeAuth imports node:http; re-exporting it from the root put
      // require("http") into dist/index.js and broke Workers consumers.
      const root = await import('../src/index');
      expect('NodeAuth' in root).toBe(false);
    });

    it('exposes NodeAuth from the dedicated node entry', async () => {
      const nodeEntry = await import('../src/node');
      expect(typeof nodeEntry.NodeAuth).toBe('function');
    });
  });
});
