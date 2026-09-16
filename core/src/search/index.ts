import { type BaseImplementation } from '../base';
import { base64Encode } from '../utils/base64';
import type { SearchParams, SearchResponse } from './types';

export class Search {
  constructor(public readonly base: BaseImplementation) {}

  /**
   * Map SDK-friendly params onto the snake_case query keys Discogs expects,
   * dropping anything left undefined.
   */
  private transformParams(params: SearchParams): Record<string, string> {
    const { query, releaseTitle, page, perPage, ...rest } = params;
    const transformed: Record<string, string> = {};

    if (query !== undefined) {
      transformed.q = query;
    }
    if (releaseTitle !== undefined) {
      transformed.release_title = releaseTitle;
    }
    if (page !== undefined) {
      transformed.page = String(page);
    }
    if (perPage !== undefined) {
      transformed.per_page = String(perPage);
    }

    for (const [key, value] of Object.entries(rest)) {
      if (value !== undefined) {
        transformed[key] = String(value);
      }
    }

    return transformed;
  }

  /**
   * Search the Discogs database.
   *
   * Works signed-in (OAuth, 240 req/min) or signed-out (consumer-key Basic
   * auth, 60 req/min).
   *
   * @returns The full `{ pagination, results }` payload.
   */
  async getSearchResults(params: SearchParams): Promise<SearchResponse> {
    const tokenManager = this.base.getTokenManager();
    const headers: Record<string, string> = {
      'User-Agent': this.base.getUserAgent(),
    };

    const [accessToken, accessTokenSecret] = await Promise.all([
      tokenManager.getAccessToken(),
      tokenManager.getAccessTokenSecret(),
    ]);

    if (accessToken && accessTokenSecret) {
      headers.Authorization = this.base.generateOAuthHeaderPublic(
        accessToken,
        accessTokenSecret,
      );
    } else {
      headers.Authorization = `Basic ${base64Encode(
        `${this.base.getConsumerKey()}:${this.base.getConsumerSecret()}`,
      )}`;
      console.warn(
        'Discogs search is using Basic auth (60 requests/minute). Authenticate with OAuth for the higher 240 requests/minute limit.',
      );
    }

    const queryString = new URLSearchParams(
      this.transformParams(params),
    ).toString();

    return this.base.requestPublic<SearchResponse>(
      `/database/search?${queryString}`,
      { method: 'GET', headers },
    );
  }
}
