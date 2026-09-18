import { type BaseImplementation } from '../base';
import { DiscogsError, ErrorCodes } from '../utils/errors';
import {
  type UserIdentityResponse,
  type RequestTokenResponse,
  type AccessTokenParams,
  type CallbackConfig,
  type OAuthTokenPair,
} from './types';
import http from 'node:http';
import { URL } from 'node:url';

const DEFAULT_CALLBACK_CONFIG: CallbackConfig = {
  port: 4567,
  host: 'localhost',
  path: '/callback',
  timeout: 5 * 60 * 1000, // 5 minutes
  customSuccessHtml: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Authentication Successful</title>
        </head>
        <body>
            <p>Authentication successful! You can close this window.</p>
        </body>
        </html>
    `,
};

/**
 * Node.js-specific Auth class with local HTTP callback server support.
 *
 * This class includes the `authenticate()` method which starts a local HTTP
 * server to handle OAuth callbacks. For serverless/edge environments like
 * Cloudflare Workers, use the Auth class from './web.ts' instead.
 *
 * @example
 * ```typescript
 * import { NodeAuth } from '@cr8.audio/discogs-sdk/node';
 * const auth = new NodeAuth(base);
 * await auth.authenticate(); // Starts local server
 * ```
 */
export class NodeAuth {
  private callbackConfig: CallbackConfig;

  constructor(
    public readonly base: BaseImplementation,
    callbackConfig: Partial<CallbackConfig> = {},
  ) {
    this.callbackConfig = { ...DEFAULT_CALLBACK_CONFIG, ...callbackConfig };
  }

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

  /**
   * Complete OAuth flow with automatic local callback server.
   * This method is Node.js-only and not available in Workers/Edge runtimes.
   */
  async authenticate(): Promise<void> {
    try {
      const oauthHandler = this.base.getOAuthHandler();
      const tokenManager = this.base.getTokenManager();

      const { url } = await oauthHandler.getAuthorizationUrl();
      console.log(
        `Please visit this URL to authorize the application:\n\n${url}`,
      );

      const oauthVerifier = await this.getOAuthVerifier();
      const requestToken = await tokenManager.getRequestToken();

      if (!requestToken) {
        throw new DiscogsError(
          'No request token found',
          ErrorCodes.AUTHENTICATION_ERROR,
        );
      }

      const tokens = await oauthHandler.handleCallback({
        oauthVerifier,
        oauthToken: requestToken,
      });

      await tokenManager.setAccessToken(tokens.token);
      await tokenManager.setAccessTokenSecret(tokens.secret);

      console.log('Authentication successful!');
    } catch (error) {
      throw new DiscogsError(
        `Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        ErrorCodes.AUTHENTICATION_ERROR,
        error,
      );
    }
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

  private getOAuthVerifier(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let serverStarted = false;
      const { port, host, timeout, customSuccessHtml } = this.callbackConfig;

      const server = http.createServer((req, res) => {
        if (!req.url) {
          return reject(
            new DiscogsError(
              'No URL in request',
              ErrorCodes.AUTHENTICATION_ERROR,
            ),
          );
        }

        const url = new URL(req.url, `http://${host}:${port}`);
        const oauthVerifier = url.searchParams.get('oauth_verifier');

        if (!oauthVerifier) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing oauth_verifier');
          server.close();
          return reject(
            new DiscogsError(
              'Missing oauth_verifier',
              ErrorCodes.AUTHENTICATION_ERROR,
            ),
          );
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(customSuccessHtml);

        server.close(() => {
          console.log('Server closed successfully');
        });
        resolve(oauthVerifier);
      });

      server.on('error', (err) => {
        if (!serverStarted) {
          reject(
            new DiscogsError(
              `Server error: ${err.message}`,
              ErrorCodes.AUTHENTICATION_ERROR,
              err,
            ),
          );
        }
      });

      server.listen(port, host, () => {
        serverStarted = true;
        console.log(`Waiting for OAuth callback on ${host}:${port}...`);
      });

      setTimeout(() => {
        if (server.listening) {
          server.close();
          reject(
            new DiscogsError(
              `OAuth verification timeout after ${timeout}ms`,
              ErrorCodes.AUTHENTICATION_ERROR,
            ),
          );
        }
      }, timeout);
    });
  }
}
