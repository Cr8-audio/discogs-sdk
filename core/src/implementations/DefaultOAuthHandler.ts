import {
  OAuthHandler,
  OAuthCallbackParams,
  OAuthConfig,
  OAuthState,
  OAuthTokenPair,
} from '../interfaces/oauth';
import { DiscogsError, ErrorCodes } from '../utils/errors';
import { HttpClient } from '../interfaces/http';

export class DefaultOAuthHandler implements OAuthHandler {
  private readonly AUTH_BASE_URL = 'https://www.discogs.com/oauth';
  private currentState: OAuthState = { status: 'initial' };
  private readonly httpClient: HttpClient;

  constructor(private readonly config: OAuthConfig) {
    this.httpClient = config.httpClient;
  }

  private setState(newState: OAuthState): void {
    this.currentState = newState;
    this.config.onStateChange?.(newState);
  }

  private generateNonce(): string {
    return `${Date.now()}${Math.random().toString().substring(2)}`;
  }

  private generateTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  async getAuthorizationUrl(): Promise<{
    url: string;
    requestTokens: OAuthTokenPair;
  }> {
    this.setState({ status: 'requesting_token' });

    try {
      const timestamp = this.generateTimestamp();
      const nonce = this.generateNonce();
      const signature = `${this.config.consumerSecret}&`;

      const authHeader =
        `OAuth oauth_consumer_key="${this.config.consumerKey}",` +
        `oauth_nonce="${nonce}",` +
        `oauth_callback="${encodeURIComponent(this.config.callbackUrl)}",` +
        `oauth_signature="${signature}",` +
        `oauth_signature_method="PLAINTEXT",` +
        `oauth_timestamp="${timestamp}",` +
        `oauth_version="1.0"`;

      const response = await this.httpClient.request<string>(
        'oauth/request_token',
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const params = new URLSearchParams(response);
      const requestToken = params.get('oauth_token');
      const requestTokenSecret = params.get('oauth_token_secret');

      if (!requestToken || !requestTokenSecret) {
        throw new DiscogsError(
          'Invalid response: Missing oauth tokens',
          ErrorCodes.INVALID_TOKEN,
        );
      }

      await this.config.storage.setItem('requestToken', requestToken);
      await this.config.storage.setItem(
        'requestTokenSecret',
        requestTokenSecret,
      );

      this.setState({ status: 'awaiting_user' });

      return {
        url: `${this.AUTH_BASE_URL}/authorize?oauth_token=${requestToken}`,
        requestTokens: {
          token: requestToken,
          secret: requestTokenSecret,
        },
      };
    } catch (error) {
      this.setState({
        status: 'initial',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async handleCallback(params: OAuthCallbackParams): Promise<OAuthTokenPair> {
    this.setState({ status: 'completing' });

    try {
      const requestToken = await this.config.storage.getItem('requestToken');
      const requestTokenSecret =
        await this.config.storage.getItem('requestTokenSecret');

      if (!requestToken || !requestTokenSecret) {
        throw new DiscogsError(
          'Missing request tokens',
          ErrorCodes.INVALID_TOKEN,
        );
      }

      const signature = `${this.config.consumerSecret}&${requestTokenSecret}`;
      const timestamp = this.generateTimestamp();
      const nonce = this.generateNonce();

      const authHeader =
        `OAuth oauth_consumer_key="${this.config.consumerKey}",` +
        `oauth_nonce="${nonce}",` +
        `oauth_token="${requestToken}",` +
        `oauth_verifier="${params.oauthVerifier}",` +
        `oauth_signature="${signature}",` +
        `oauth_signature_method="PLAINTEXT",` +
        `oauth_timestamp="${timestamp}",` +
        `oauth_version="1.0"`;

      const response = await this.httpClient.request<string>(
        'oauth/access_token',
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const responseParams = new URLSearchParams(response);
      const accessToken = responseParams.get('oauth_token');
      const accessTokenSecret = responseParams.get('oauth_token_secret');

      if (!accessToken || !accessTokenSecret) {
        throw new DiscogsError(
          'Invalid response: Missing access tokens',
          ErrorCodes.INVALID_TOKEN,
        );
      }

      await this.config.storage.setItem('accessToken', accessToken);
      await this.config.storage.setItem('accessTokenSecret', accessTokenSecret);

      this.setState({ status: 'authenticated' });

      return {
        token: accessToken,
        secret: accessTokenSecret,
      };
    } catch (error) {
      this.setState({
        status: 'initial',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
