import { Config, BaseImplementation } from '../base';
import { StorageAdapter } from '../interfaces/storage';
import { MemoryStorageAdapter } from '../adapters/memoryStorage';
import {
  DefaultHttpClient,
  RateLimitOptions,
} from '../implementations/DefaultHttpClient';
import { DefaultOAuthHandler } from '../implementations/DefaultOAuthHandler';
import { DefaultTokenManager } from '../implementations/DefaultTokenManager';

export interface DiscogsSDKConfig {
  DiscogsConsumerKey: string;
  DiscogsConsumerSecret: string;
  baseUrl?: string;
  callbackUrl?: string;
  userAgent?: string;
  /** Optional Discogs rate-limit / 429 retry behavior for DefaultHttpClient. */
  rateLimit?: RateLimitOptions;
}

export class DiscogsFactory {
  static createDefault(config: DiscogsSDKConfig): BaseImplementation {
    const storage = new MemoryStorageAdapter();
    const httpClient = new DefaultHttpClient(
      config.baseUrl || 'https://api.discogs.com',
      config.userAgent || 'DefaultUserAgent/1.0',
      config.rateLimit,
    );
    const tokenManager = new DefaultTokenManager(storage);
    const oauthHandler = new DefaultOAuthHandler({
      consumerKey: config.DiscogsConsumerKey,
      consumerSecret: config.DiscogsConsumerSecret,
      callbackUrl: config.callbackUrl || 'http://localhost:4567/callback',
      storage,
      httpClient,
      onStateChange: undefined,
    });

    return new BaseImplementation({
      ...config,
      storage,
      httpClient,
      tokenManager,
      oauthHandler,
    });
  }

  static createWithCustomStorage(
    config: DiscogsSDKConfig,
    storage: StorageAdapter,
  ): BaseImplementation {
    const httpClient = new DefaultHttpClient(
      config.baseUrl || 'https://api.discogs.com',
      config.userAgent || 'DefaultUserAgent/1.0',
      config.rateLimit,
    );
    const tokenManager = new DefaultTokenManager(storage);
    const oauthHandler = new DefaultOAuthHandler({
      consumerKey: config.DiscogsConsumerKey,
      consumerSecret: config.DiscogsConsumerSecret,
      callbackUrl: config.callbackUrl || 'http://localhost:4567/callback',
      storage,
      httpClient,
      onStateChange: undefined,
    });

    return new BaseImplementation({
      ...config,
      storage,
      httpClient,
      tokenManager,
      oauthHandler,
    });
  }

  static createWithCustomDependencies(config: Config): BaseImplementation {
    return new BaseImplementation(config);
  }
}
