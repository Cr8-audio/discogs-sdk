import { type StorageAdapter } from '../interfaces/storage';

/**
 * In-memory token storage — the default adapter.
 *
 * Tokens live only for the lifetime of the instance, which is the right
 * default for serverless/edge handlers. Supply your own `StorageAdapter`
 * (KV, Redis, a database) to persist them across requests.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private storage = new Map<string, string>();

  async getItem(key: string): Promise<string | null> {
    return this.storage.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.storage.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.storage.delete(key);
  }

  async clear(): Promise<void> {
    this.storage.clear();
  }
}
