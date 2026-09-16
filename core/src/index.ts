import { Auth } from './auth';
import { BaseImplementation, type Config } from './base';
import { Collection } from './collection';
import { Search } from './search';
import {
  DiscogsFactory,
  type DiscogsSDKConfig,
} from './factories/discogsFactory';
import { type StorageAdapter } from './interfaces/storage';
import { User } from './user';

// Contracts
export * from './interfaces/http';
export * from './interfaces/oauth';
export * from './interfaces/storage';
export * from './interfaces/token';

// Default implementations
export * from './implementations/DefaultHttpClient';
export * from './implementations/DefaultTokenManager';
export * from './implementations/DefaultOAuthHandler';
export * from './adapters/memoryStorage';

// Utilities
export * from './utils/errors';
export * from './utils/rateLimit';
export * from './utils/base64';

// Resource classes
export { Auth } from './auth';
export { Base, BaseImplementation } from './base';
export type { Config } from './base';
export { Collection } from './collection';
export { Search } from './search';
export { User } from './user';
export { DiscogsFactory } from './factories/discogsFactory';
export type { DiscogsSDKConfig } from './factories/discogsFactory';

// Resource types
export * from './types/common';
export type { UserIdentityResponse, CallbackConfig } from './auth/types';
export * from './collection/types';
export * from './search/types';
export * from './user/types';

/**
 * Discogs API client.
 *
 * The package root is free of Node built-ins and runs in Cloudflare Workers,
 * Deno, and browsers. For the Node-only local OAuth callback server, import
 * `NodeAuth` from `@cr8.audio/discogs-sdk/node`.
 *
 * @example
 * ```ts
 * const discogs = new DiscogsSDK({
 *   DiscogsConsumerKey: env.DISCOGS_CONSUMER_KEY,
 *   DiscogsConsumerSecret: env.DISCOGS_CONSUMER_SECRET,
 * });
 * const { results } = await discogs.search.getSearchResults({ query: 'rush' });
 * ```
 */
export class DiscogsSDK {
  private readonly base: BaseImplementation;
  public readonly auth: Auth;
  public readonly collection: Collection;
  public readonly search: Search;
  public readonly user: User;

  constructor(config: DiscogsSDKConfig);
  /** @internal — used by the static factory helpers. */
  constructor(base: BaseImplementation);
  constructor(configOrBase: DiscogsSDKConfig | BaseImplementation) {
    this.base =
      configOrBase instanceof BaseImplementation
        ? configOrBase
        : DiscogsFactory.createDefault(configOrBase);

    this.auth = new Auth(this.base);
    this.collection = new Collection(this.base);
    this.search = new Search(this.base);
    this.user = new User(this.base);
  }

  /** Build an SDK that persists tokens through your own storage adapter. */
  static withCustomStorage(
    config: DiscogsSDKConfig,
    storage: StorageAdapter,
  ): DiscogsSDK {
    return new DiscogsSDK(
      DiscogsFactory.createWithCustomStorage(config, storage),
    );
  }

  /** Build an SDK from a fully supplied set of dependencies. */
  static withCustomDependencies(config: Config): DiscogsSDK {
    return new DiscogsSDK(DiscogsFactory.createWithCustomDependencies(config));
  }
}
