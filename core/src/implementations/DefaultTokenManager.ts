import { type StorageAdapter } from '../interfaces/storage';
import { type TokenManager } from '../interfaces/token';

export class DefaultTokenManager implements TokenManager {
  constructor(private storage: StorageAdapter) {}

  async getAccessToken(): Promise<string | null> {
    return await this.storage.getItem('accessToken');
  }

  async setAccessToken(token: string): Promise<void> {
    await this.storage.setItem('accessToken', token);
  }

  async getRequestToken(): Promise<string | null> {
    return await this.storage.getItem('requestToken');
  }

  async setRequestToken(token: string): Promise<void> {
    await this.storage.setItem('requestToken', token);
  }

  async getRequestTokenSecret(): Promise<string | null> {
    return await this.storage.getItem('requestTokenSecret');
  }

  async setRequestTokenSecret(secret: string): Promise<void> {
    await this.storage.setItem('requestTokenSecret', secret);
  }

  async getAccessTokenSecret(): Promise<string | null> {
    return await this.storage.getItem('accessTokenSecret');
  }

  async setAccessTokenSecret(secret: string): Promise<void> {
    await this.storage.setItem('accessTokenSecret', secret);
  }

  async clearTokens(): Promise<void> {
    await Promise.all([
      this.storage.removeItem('accessToken'),
      this.storage.removeItem('requestToken'),
      this.storage.removeItem('requestTokenSecret'),
      this.storage.removeItem('accessTokenSecret'),
    ]);
  }
}
