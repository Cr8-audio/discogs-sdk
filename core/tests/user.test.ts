import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockHttpClient } from './__mocks__/mockHttpClient';
import { MockStorageAdapter } from './__mocks__/mockStorage';
import { createTestConfig } from './helpers/setup';
import { BaseImplementation } from '../src/base';
import { User } from '../src/user';

describe('User', () => {
  let sdk: BaseImplementation;
  let httpClient: MockHttpClient;
  let storage: MockStorageAdapter;
  let user: User;

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
    user = new User(sdk);
  });

  describe('authentication methods', () => {
    it('should use OAuth when tokens are available', async () => {
      // Set up OAuth tokens
      await storage.setItem('accessToken', 'test_access_token');
      await storage.setItem('accessTokenSecret', 'test_access_secret');
      await storage.setItem('requestTokenSecret', 'test_request_secret');

      const mockResults = [
        {
          id: 2510467,
          resource_url: 'https://api.discogs.com/users/gmohan218',
          uri: 'https://www.discogs.com/user/gmohan218',
          username: 'gmohan218',
          name: 'Govind Mohan',
          home_page: '',
          location: '',
          profile: '',
          registered: '2014-11-07T18:53:37-08:00',
          rank: 0,
          num_pending: 0,
          num_for_sale: 0,
          num_lists: 0,
          releases_contributed: 0,
          releases_rated: 1,
          rating_avg: 5,
          inventory_url: 'https://api.discogs.com/users/gmohan218/inventory',
          collection_folders_url:
            'https://api.discogs.com/users/gmohan218/collection/folders',
          collection_fields_url:
            'https://api.discogs.com/users/gmohan218/collection/fields',
          wantlist_url: 'https://api.discogs.com/users/gmohan218/wants',
          avatar_url:
            'https://gravatar.com/avatar/ae2c3ac6344cb1f52fd75647dc2dcf2d58320249b2c6b19fe3d78b0a4c485601?s=500&r=pg&d=mm',
          curr_abbr: 'USD',
          activated: true,
          marketplace_suspended: false,
          banner_url: '',
          buyer_rating: 0,
          buyer_rating_stars: 0,
          buyer_num_ratings: 1,
          seller_rating: 0,
          seller_rating_stars: 0,
          seller_num_ratings: 0,
          is_staff: false,
          num_collection: 1,
          num_wantlist: 0,
          num_unread: 1,
        },
      ];

      httpClient.setMockResponse('users/gmohan218', {
        ok: true,
        status: 200,
        data: mockResults,
      });

      const result = await user.getUser({ username: 'gmohan218' });
      expect(result).toEqual(mockResults);
      expect(console.warn).not.toHaveBeenCalled();

      const lastRequest = httpClient.getLastRequest();
      expect(lastRequest?.headers?.authorization).toContain('OAuth');
    });
  });
});
