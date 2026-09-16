import { describe, it, expect, beforeEach } from 'vitest';
import { Auth } from '../src';
import { MockHttpClient } from './__mocks__/mockHttpClient';
import { MockStorageAdapter } from './__mocks__/mockStorage';
import { DiscogsError } from '../src/utils/errors';
import { createTestConfig } from './helpers/setup';
import { BaseImplementation } from '../src/base';

describe('Auth', () => {
  let sdk: BaseImplementation;
  let httpClient: MockHttpClient;
  let storage: MockStorageAdapter;
  let auth: Auth;

  beforeEach(() => {
    // Create instances first
    httpClient = new MockHttpClient();
    storage = new MockStorageAdapter();

    // Clear any existing mocks
    httpClient.clearMocks();

    // Create the config with our instances
    const config = createTestConfig({
      storage,
      httpClient, // Pass the same httpClient instance
      DiscogsConsumerKey: 'test_consumer_key',
      DiscogsConsumerSecret: 'test_consumer_secret',
      callbackUrl: 'http://localhost:4567/callback',
    });

    // Create SDK and auth instances
    sdk = new BaseImplementation(config);
    auth = new Auth(sdk);

    // Set up default successful response for request token
    httpClient.setMockResponse('oauth/request_token', {
      ok: true,
      status: 200,
      data: {
        oauth_token: 'test_token',
        oauth_token_secret: 'test_secret',
      },
    });
  });

  it('should generate authorization url', async () => {
    const url = await auth.getAuthorizationUrl();
    expect(url).toContain('oauth_token=test_token');
  });

  it('should handle callback successfully', async () => {
    // First get the authorization URL to set up the request tokens
    await auth.getAuthorizationUrl(); // This will store the request tokens

    // Then handle the callback
    httpClient.setMockResponse('oauth/access_token', {
      ok: true,
      status: 200,
      data: {
        oauth_token: 'test_access_token',
        oauth_token_secret: 'test_access_secret',
      },
    });

    const result = await auth.handleCallback({
      oauthToken: 'test_token',
      oauthVerifier: 'test_verifier',
    });

    expect(result).toEqual({
      token: 'test_access_token',
      secret: 'test_access_secret',
    });
  });

  it('should handle authentication errors', async () => {
    httpClient.setMockResponse('oauth/request_token', {
      ok: false,
      status: 401,
      data: 'Invalid consumer',
    });

    await expect(auth.getAuthorizationUrl()).rejects.toThrow(DiscogsError);
  });

  it('should handle missing tokens in callback', async () => {
    httpClient.setMockResponse('oauth/access_token', {
      ok: true,
      status: 200,
      data: {
        oauth_token: 'test_access_token',
        oauth_token_secret: 'test_access_secret',
      },
    });

    await expect(
      auth.handleCallback({
        oauthVerifier: 'test_verifier',
        oauthToken: 'test_token',
      }),
    ).rejects.toThrow(DiscogsError);
  });

  it('should handle network errors in callback', async () => {
    // Set up request tokens
    await storage.setItem('requestToken', 'test_token');
    await storage.setItem('requestTokenSecret', 'test_secret');

    // Set up error response
    httpClient.setMockResponse('oauth/access_token', {
      ok: false,
      status: 500,
      data: null,
    });

    await expect(
      auth.handleCallback({
        oauthVerifier: 'test_verifier',
        oauthToken: 'test_token',
      }),
    ).rejects.toThrow(DiscogsError);
  });
});
