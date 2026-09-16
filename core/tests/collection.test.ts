import { describe, it, expect, beforeEach } from 'vitest';
import { Collection } from '../src';
import { MockHttpClient } from './__mocks__/mockHttpClient';
import { MockStorageAdapter } from './__mocks__/mockStorage';
import { DiscogsError } from '../src/utils/errors';
import { createTestConfig } from './helpers/setup';
import { BaseImplementation } from '../src/base';

describe('Collection', () => {
  let sdk: BaseImplementation;
  let httpClient: MockHttpClient;
  let storage: MockStorageAdapter;
  let collection: Collection;

  beforeEach(() => {
    httpClient = new MockHttpClient();
    storage = new MockStorageAdapter();

    httpClient.clearMocks();

    const config = createTestConfig({
      storage,
      httpClient,
      DiscogsConsumerKey: 'test_consumer_key',
      DiscogsConsumerSecret: 'test_consumer_secret',
    });

    sdk = new BaseImplementation(config);
    collection = new Collection(sdk);

    // Set up mock user identity
    storage.setItem(
      'userIdentity',
      JSON.stringify({
        id: 1,
        username: 'testuser',
        resource_url: 'https://api.discogs.com/users/testuser',
        consumer_name: 'TestApp',
      }),
    );

    // Set up mock tokens
    storage.setItem('accessToken', 'test_access_token');
    storage.setItem('accessTokenSecret', 'test_access_secret');
  });

  it('should get user collection', async () => {
    const mockResponse = {
      pagination: { page: 1, pages: 1, items: 1, per_page: 50 },
      releases: [
        {
          id: 123,
          basic_information: {
            title: 'Test Album',
            year: 2023,
            artists: [{ name: 'Test Artist' }],
          },
        },
      ],
    };

    httpClient.setMockResponse(
      'users/testuser/collection/folders/0/releases?page=1&per_page=50',
      {
        ok: true,
        status: 200,
        data: mockResponse,
      },
    );

    const result = await collection.getCollection({ username: 'testuser' });
    expect(result).toEqual(mockResponse);
  });

  it('should handle unauthorized access', async () => {
    await storage.setItem('accessToken', 'test_access_token');

    await expect(
      collection.getCollection({ username: 'testuser' }),
    ).rejects.toThrow(DiscogsError);
  });

  it('should get collection folders', async () => {
    const mockResponse = {
      folders: [
        {
          id: 0,
          name: 'All',
          count: 10,
        },
        {
          id: 1,
          name: 'Favorites',
          count: 5,
        },
      ],
    };

    httpClient.setMockResponse('users/testuser/collection/folders', {
      ok: true,
      status: 200,
      data: mockResponse,
    });

    const result = await collection.getFolders('testuser');
    expect(result).toEqual(mockResponse);
  });

  it('should add release to collection', async () => {
    const mockResponse = {
      instance_id: 1234,
      resource_url:
        'https://api.discogs.com/users/testuser/collection/folders/1/releases/123',
    };

    httpClient.setMockResponse(
      'users/testuser/collection/folders/1/releases/123',
      {
        ok: true,
        status: 200,
        data: mockResponse,
      },
    );

    const result = await collection.addToCollection(123, 1);
    expect(result).toEqual(mockResponse);
  });
});
