import { StorageAdapter } from './interfaces/storage';
import { MemoryStorageAdapter } from './adapters/memoryStorage';
import { TokenManager } from './interfaces/token';
import { OAuthHandler } from './interfaces/oauth';
import { HttpClient } from './interfaces/http';
import { DefaultHttpClient } from './implementations/DefaultHttpClient';
import { DefaultTokenManager } from './implementations/DefaultTokenManager';
import { DefaultOAuthHandler } from './implementations/DefaultOAuthHandler';
export type Config = {
  DiscogsConsumerKey: string;
  DiscogsConsumerSecret: string;
  baseUrl?: string;
  callbackUrl?: string;
  userAgent?: string;
  storage: StorageAdapter; // Required now, not optional
  httpClient: HttpClient; // Required now, not optional
  oauthHandler: OAuthHandler; // Required now, not optional
  tokenManager: TokenManager; // Required now, not optional
};

export abstract class Base {
  protected readonly httpClient: HttpClient;
  protected readonly storage: StorageAdapter;
  protected readonly tokenManager: TokenManager;
  protected readonly oauthHandler: OAuthHandler;
  protected readonly consumerKey: string;
  protected readonly consumerSecret: string;
  protected readonly callbackUrl: string;
  protected readonly userAgent: string;
  protected readonly baseUrl: string;

  constructor(config: Config) {
    // Initialize core configuration
    this.consumerKey = config.DiscogsConsumerKey;
    this.consumerSecret = config.DiscogsConsumerSecret;
    this.baseUrl = config.baseUrl || 'https://api.discogs.com';
    this.callbackUrl = config.callbackUrl || 'http://localhost:4567/callback';
    this.userAgent = config.userAgent || 'DefaultUserAgent/1.0';

    // Dependencies must be injected
    this.storage = config.storage;
    this.httpClient = config.httpClient;
    this.tokenManager = config.tokenManager;
    this.oauthHandler = config.oauthHandler;
  }

  // Protected getters for core configuration
  protected get consumerKeyGetter(): string {
    return this.consumerKey;
  }

  protected get consumerSecretGetter(): string {
    return this.consumerSecret;
  }

  protected get callbackUrlGetter(): string {
    return this.callbackUrl;
  }

  protected get baseUrlGetter(): string {
    return this.baseUrl;
  }

  protected get userAgentGetter(): string {
    return this.userAgent;
  }

  // Utility methods
  protected generateNonce(): string {
    return Date.now().toString() + Math.random().toString().substring(2);
  }

  protected generateTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  /**
   * Generates OAuth header for API requests
   * @param {string} [oauthToken] - Optional OAuth token for authorized requests
   * @param {string} [oauthTokenSecret] - Optional OAuth token secret for signature
   * @returns {string} The generated OAuth header
   */
  protected generateOAuthHeader(
    oauthToken?: string,
    oauthTokenSecret?: string,
  ): string {
    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();
    let signature = `${this.consumerSecret}&`;
    if (oauthTokenSecret) {
      signature += oauthTokenSecret;
    }

    let header = `OAuth oauth_consumer_key="${this.consumerKey}",oauth_signature_method="PLAINTEXT",oauth_timestamp="${timestamp}",oauth_nonce="${nonce}",oauth_version="1.0",oauth_signature="${signature}"`;

    if (oauthToken) {
      header += `,oauth_token="${oauthToken}"`;
    }

    return header;
  }

  /**
   * Makes a request to the Discogs API using the configured HttpClient
   * @template T - The expected response type
   * @param {string} endpoint - The API endpoint to request
   * @param {RequestInit} [options] - The request options
   * @param {any} [body] - The request body
   * @returns {Promise<T>} A promise that resolves with the API response
   */
  protected async request<T>(
    endpoint: string,
    options?: RequestInit,
    body?: unknown,
  ): Promise<T> {
    const [oauthToken, oauthTokenSecret] = await Promise.all([
      this.tokenManager.getAccessToken(),
      this.tokenManager.getAccessTokenSecret(),
    ]);

    const headers = new Headers({
      Authorization: this.generateOAuthHeader(oauthToken, oauthTokenSecret),
      'User-Agent': this.userAgent,
    });

    let requestBody: BodyInit | undefined;
    if (body !== undefined && body !== null) {
      if (typeof body === 'string') {
        headers.set('Content-Type', 'application/x-www-form-urlencoded');
        requestBody = body;
      } else {
        headers.set('Content-Type', 'application/json');
        requestBody = JSON.stringify(body);
      }
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      body: requestBody,
      method: options?.method || 'GET',
    };

    return this.httpClient.request<T>(endpoint, requestOptions, requestBody);
  }
}

export class BaseImplementation extends Base {
  constructor(config: Config) {
    super(config);
  }

  public getHttpClient(): HttpClient {
    return this.httpClient;
  }

  public getTokenManager(): TokenManager {
    return this.tokenManager;
  }

  public getOAuthHandler(): OAuthHandler {
    return this.oauthHandler;
  }

  public getStorage(): StorageAdapter {
    return this.storage;
  }

  public getUserAgent(): string {
    return this.userAgent;
  }

  public generateOAuthHeaderPublic(
    oauthToken?: string,
    oauthTokenSecret?: string,
  ): string {
    return this.generateOAuthHeader(oauthToken, oauthTokenSecret);
  }

  public async requestPublic<T>(
    endpoint: string,
    options?: RequestInit,
    body?: unknown,
  ): Promise<T> {
    return this.request<T>(endpoint, options, body);
  }

  getConsumerKey(): string {
    return this.consumerKey;
  }

  getConsumerSecret(): string {
    return this.consumerSecret;
  }
}
