import { DiscogsError, ErrorCodes } from '../utils/errors';
import { type BaseImplementation } from '../base';
import { type UserParams, type UserResult } from './types';

export class User {
  constructor(public readonly base: BaseImplementation) {}

  /**
   * Retrieves a Discogs user with the given username.
   * @returns {Promise<UserResult[]>} User details
   */
  async getUser(params: UserParams): Promise<UserResult> {
    const tokenManager = this.base.getTokenManager();
    const [oauthToken, oauthTokenSecret] = await Promise.all([
      tokenManager.getAccessToken(),
      tokenManager.getAccessTokenSecret(),
    ]);

    if (!oauthToken || !oauthTokenSecret) {
      throw new DiscogsError(
        'Authentication required to access collection',
        ErrorCodes.AUTHENTICATION_ERROR,
      );
    }

    const authorizationHeader = this.base.generateOAuthHeaderPublic(
      oauthToken,
      oauthTokenSecret,
    );

    const headers = {
      Authorization: authorizationHeader,
      'User-Agent': this.base.getUserAgent(),
    };

    const url = `/users/${params.username}`;

    return this.base.requestPublic<UserResult>(url, {
      method: 'GET',
      headers,
    });
  }
}
