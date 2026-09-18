import { type HttpClient } from './http';
import { type StorageAdapter } from './storage';

export interface OAuthState {
  status:
    | 'initial'
    | 'requesting_token'
    | 'awaiting_user'
    | 'completing'
    | 'authenticated';
  error?: string;
}

export interface OAuthTokenPair {
  token: string;
  secret: string;
}

export interface OAuthCallbackParams {
  oauthVerifier: string;
  oauthToken: string;
}

// interfaces/oauth.ts
export interface OAuthConfig {
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
  storage: StorageAdapter;
  httpClient: HttpClient; // Add this
  onStateChange?: (state: OAuthState) => void;
}

export interface OAuthHandler {
  getAuthorizationUrl(): Promise<{
    url: string;
    requestTokens: OAuthTokenPair;
  }>;
  handleCallback(params: OAuthCallbackParams): Promise<OAuthTokenPair>;
}

export interface RequestTokenResponse {
  verificationURL: string;
  requestTokens: OAuthTokenPair;
}

export interface AccessTokenParams {
  oauthVerifier: string;
  oauthToken: string;
}
