import { BaseImplementation } from '../base';
import { DiscogsError, ErrorCodes } from '../utils/errors';
import {
  UserIdentityResponse,
  RequestTokenResponse,
  AccessTokenParams,
  OAuthTokenPair,
} from './types';

/**
 * Web-compatible Auth class for Cloudflare Workers, Deno, and browsers.
 * 
 * This version excludes Node.js-specific functionality like the local HTTP
 * callback server. For Node.js environments with local OAuth flows, use
 * the NodeAuth class from './node.ts' instead.
 */
export class Auth {
  constructor(public readonly base: BaseImplementation) {}

  async getAuthorizationUrl(): Promise<string> {
    const oauthHandler = this.base.getOAuthHandler();
    const { url } = await oauthHandler.getAuthorizationUrl();
    return url;
  }

  async getRequestToken(): Promise<RequestTokenResponse> {
    const oauthHandler = this.base.getOAuthHandler();
    const tokenManager = this.base.getTokenManager();

    const { url, requestTokens } = await oauthHandler.getAuthorizationUrl();

    await tokenManager.setRequestToken(requestTokens.token);
    await tokenManager.setRequestTokenSecret(requestTokens.secret);

    return {
      verificationURL: url,
      requestTokens,
    };
  }

  async handleCallback(params: AccessTokenParams): Promise<OAuthTokenPair> {
    const oauthHandler = this.base.getOAuthHandler();
    const tokenManager = this.base.getTokenManager();

    const tokens = await oauthHandler.handleCallback({
      oauthVerifier: params.oauthVerifier,
      oauthToken: params.oauthToken,
    });

    await tokenManager.setAccessToken(tokens.token);
    await tokenManager.setAccessTokenSecret(tokens.secret);

    return tokens;
  }

  async getUserIdentity(): Promise<UserIdentityResponse> {
    const tokenManager = this.base.getTokenManager();
    const accessToken = await tokenManager.getAccessToken();
    const accessTokenSecret = await tokenManager.getAccessTokenSecret();

    if (!accessToken || !accessTokenSecret) {
      throw new DiscogsError(
        'Authentication required. Please authenticate first.',
        ErrorCodes.AUTHENTICATION_ERROR,
      );
    }

    const authHeader = this.base.generateOAuthHeaderPublic(
      accessToken,
      accessTokenSecret,
    );
    const headers = {
      Authorization: authHeader,
      'User-Agent': this.base.getUserAgent(),
    };

    return await this.base.requestPublic<UserIdentityResponse>(
      'oauth/identity',
      {
        method: 'GET',
        headers,
      },
    );
  }
}
