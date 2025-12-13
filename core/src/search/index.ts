import { BaseImplementation } from '../base';
import type { SearchParams, SearchResult } from './types';

export class Search {
  constructor(public readonly base: BaseImplementation) {}

  private transformParams(params: SearchParams): Record<string, string> {
    const { query, releaseTitle, ...rest } = params;
    const transformed: Record<string, string> = {
      q: query,
      ...rest,
    };

    if (releaseTitle) {
      transformed.release_title = releaseTitle;
    }

    return transformed;
  }

  async getSearchResults(params: SearchParams): Promise<SearchResult[]> {
    const tokenManager = this.base.getTokenManager();
    const headers: Record<string, string> = {
      'User-Agent': this.base.getUserAgent(),
    };

    try {
      const [accessToken, tokenSecret] = await Promise.all([
        tokenManager.getAccessToken(),
        tokenManager.getRequestTokenSecret(),
      ]);

      if (accessToken && tokenSecret) {
        headers.Authorization = this.base.generateOAuthHeaderPublic(
          accessToken,
          tokenSecret,
        );
      } else {
        throw new Error('No OAuth tokens available');
      }
    } catch (error) {
      // Fall back to Basic Auth if OAuth fails or tokens aren't available
      const { base64Encode } = await import('../utils/base64');
      const basicAuth = base64Encode(
        `${this.base.getConsumerKey()}:${this.base.getConsumerSecret()}`,
      );
      headers.Authorization = `Basic ${basicAuth}`;
      console.warn(
        'Using Basic Auth. Rate limits will be restricted to 60 requests/minute. Consider using OAuth for higher limits (240 req/min).',
      );
    }

    const transformedParams = this.transformParams(params);
    const queryString = new URLSearchParams(transformedParams).toString();
    const url = `/database/search?${queryString}`;

    return this.base.requestPublic<SearchResult[]>(url, {
      method: 'GET',
      headers,
    });
  }
}
