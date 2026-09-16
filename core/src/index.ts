import { Auth } from './auth';
import { Base, BaseImplementation, Config } from './base';
import { Collection } from './collection';
import { Search } from './search';
import { DiscogsFactory, DiscogsSDKConfig } from './factories/discogsFactory';
import { StorageAdapter } from './interfaces/storage';
import { User } from './user';

export * from './interfaces/http';
export * from './interfaces/oauth';
export * from './interfaces/storage';
export * from './interfaces/token';

export * from './implementations/DefaultHttpClient';
export * from './implementations/DefaultTokenManager';
export * from './implementations/DefaultOAuthHandler';

export * from './adapters/memoryStorage';

export * from './utils/errors';
export * from './utils/rateLimit';
export * from './utils/base64';


export { Auth, NodeAuth } from './auth';
export { Base, BaseImplementation, Config } from './base';
export { Collection } from './collection';
export { Search } from './search';
export { DiscogsFactory, DiscogsSDKConfig } from './factories/discogsFactory';

export class DiscogsSDK {
  private base: BaseImplementation;
  public auth: Auth;
  public collection: Collection;
  public search: Search;
  public user: User;

  constructor(config: DiscogsSDKConfig) {
    this.base = DiscogsFactory.createDefault(config);
    this.auth = new Auth(this.base);
    this.collection = new Collection(this.base);
    this.search = new Search(this.base);
    this.user = new User(this.base);
  }

  static withCustomStorage(
    config: DiscogsSDKConfig,
    storage: StorageAdapter,
  ): DiscogsSDK {
    const sdk = new DiscogsSDK(config);
    sdk.base = DiscogsFactory.createWithCustomStorage(config, storage);
    return sdk;
  }

  static withCustomDependencies(config: Config): DiscogsSDK {
    const sdk = new DiscogsSDK(config);
    sdk.base = DiscogsFactory.createWithCustomDependencies(config);
    return sdk;
  }
}
