import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Search } from '../src';
import { MockHttpClient } from './__mocks__/mockHttpClient';
import { MockStorageAdapter } from './__mocks__/mockStorage';
import { DiscogsError, ErrorCodes } from '../src/utils/errors';
import { createTestConfig } from './helpers/setup';
import { BaseImplementation } from '../src/base';

describe('Search', () => {
  let sdk: BaseImplementation;
  let httpClient: MockHttpClient;
  let storage: MockStorageAdapter;
  let search: Search;

  beforeEach(async () => {
    httpClient = new MockHttpClient();
    storage = new MockStorageAdapter();

    httpClient.clearMocks();
    storage.clear();

    vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config = createTestConfig({
      storage,
      httpClient,
      DiscogsConsumerKey: 'test_consumer_key',
      DiscogsConsumerSecret: 'test_consumer_secret',
    });

    sdk = new BaseImplementation(config);
    search = new Search(sdk);
  });

  describe('authentication methods', () => {
    it('should use OAuth when tokens are available', async () => {
      // Set up OAuth tokens
      await storage.setItem('accessToken', 'test_access_token');
      await storage.setItem('accessTokenSecret', 'test_access_secret');
      await storage.setItem('requestTokenSecret', 'test_request_secret');

      const mockResponse = {
        pagination: {
          per_page: 50,
          pages: 1,
          page: 1,
          items: 1,
          urls: {},
        },
        results: [
          {
            id: 123,
            title: 'Test Album',
            year: '2023',
            type: 'release',
          },
        ],
      };

      httpClient.setMockResponse('database/search', {
        ok: true,
        status: 200,
        data: mockResponse,
      });

      const result = await search.getSearchResults({
        query: 'test',
        type: 'release',
      });

      expect(result).toEqual(mockResponse);
      expect(result.results).toHaveLength(1);
      expect(result.pagination.items).toBe(1);
      expect(console.warn).not.toHaveBeenCalled();

      const lastRequest = httpClient.getLastRequest();
      expect(lastRequest?.headers?.authorization).toContain('OAuth');
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await storage.setItem('accessToken', 'test_access_token');
      await storage.setItem('accessTokenSecret', 'test_access_secret');
    });

    it('should handle rate limiting', async () => {
      httpClient.setMockResponse('database/search', {
        ok: false,
        status: 429,
        data: 'Rate limit exceeded',
      });

      await expect(search.getSearchResults({ query: 'test' })).rejects.toThrow(
        DiscogsError,
      );
    });

    it('should handle API errors', async () => {
      httpClient.setMockResponse('database/search', {
        ok: false,
        status: 500,
        data: 'Internal Server Error',
      });

      await expect(search.getSearchResults({ query: 'test' })).rejects.toThrow(
        DiscogsError,
      );
    });

    it('should handle missing mock responses', async () => {
      await expect(search.getSearchResults({ query: 'test' })).rejects.toThrow(
        new DiscogsError(
          'No mock response set for endpoint: database/search?q=test',
          ErrorCodes.NETWORK_ERROR,
        ),
      );
    });
  });

  describe('query parameter handling', () => {
    beforeEach(async () => {
      await storage.setItem('accessToken', 'test_access_token');
      await storage.setItem('accessTokenSecret', 'test_access_secret');
    });

    it('should handle all supported search parameters', async () => {
      httpClient.setMockResponse('database/search', {
        ok: true,
        status: 200,
        data: {
          pagination: { per_page: 50, pages: 1, page: 1, items: 1, urls: {} },
          results: [{ id: 123, title: 'Test Album', type: 'release' }],
        },
      });

      await search.getSearchResults({
        query: 'nirvana',
        type: 'release',
        title: 'nirvana - nevermind',
        releaseTitle: 'nevermind',
        credit: 'kurt',
        artist: 'nirvana',
        label: 'dgc',
        genre: 'rock',
        style: 'grunge',
        country: 'canada',
        year: '1991',
        format: 'album',
        catno: 'DGCD-24425',
        barcode: '7 2064-24425-2 4',
        track: 'smells like teen spirit',
      });

      const lastRequest = httpClient.getLastRequest();
      const requestUrl = lastRequest?.url || '';
      const params = new URLSearchParams(requestUrl.split('?')[1]);

      // Verify all parameters
      expect(params.get('q')).toBe('nirvana');
      expect(params.get('type')).toBe('release');
      expect(params.get('title')).toBe('nirvana - nevermind');
      expect(params.get('release_title')).toBe('nevermind');
      expect(params.get('credit')).toBe('kurt');
      expect(params.get('artist')).toBe('nirvana');
      expect(params.get('label')).toBe('dgc');
      expect(params.get('genre')).toBe('rock');
      expect(params.get('style')).toBe('grunge');
      expect(params.get('country')).toBe('canada');
      expect(params.get('year')).toBe('1991');
      expect(params.get('format')).toBe('album');
      expect(params.get('catno')).toBe('DGCD-24425');
      expect(params.get('barcode')).toBe('7 2064-24425-2 4');
      expect(params.get('track')).toBe('smells like teen spirit');
    });
  });
});
