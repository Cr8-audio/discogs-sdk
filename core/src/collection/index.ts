import { type BaseImplementation } from '../base';
import { DiscogsError, ErrorCodes } from '../utils/errors';
import type {
  CollectionResponse,
  CollectionParams,
  FoldersResponse,
  CollectionModificationResponse,
  CollectionSortField,
} from './types';
import type { UserIdentityResponse } from '../auth/types';

export class Collection {
  constructor(private readonly base: BaseImplementation) {}

  /**
   * Get items from a collection folder
   * @param params Collection parameters including username, folder ID, and pagination
   * @throws {DiscogsError} If authentication fails or network error occurs
   */
  async getCollection(params: CollectionParams): Promise<CollectionResponse> {
    try {
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

      // Get user identity
      const storage = this.base.getStorage();
      const userIdentityStr = await storage.getItem('userIdentity');
      let userIdentity: UserIdentityResponse | null = null;

      if (userIdentityStr) {
        try {
          userIdentity = JSON.parse(userIdentityStr) as UserIdentityResponse;
        } catch {
          console.warn('Failed to parse user identity from storage');
        }
      }

      const {
        folderId = 0,
        page = 1,
        perPage = 50,
        username = userIdentity?.username,
        sort,
        sortOrder = 'asc',
        format,
        status,
        yearRange,
      } = params;

      if (!username) {
        throw new DiscogsError(
          'Username is required to fetch collection',
          ErrorCodes.CONFIGURATION_ERROR,
        );
      }

      // Build query parameters
      const queryParams = new URLSearchParams();

      // Pagination
      queryParams.append('page', page.toString());
      queryParams.append('per_page', perPage.toString());

      // Sorting
      if (sort) {
        queryParams.append('sort', sort);
        queryParams.append('sort_order', sortOrder);
      }

      // Format filtering
      if (format) {
        queryParams.append('format', format);
      }

      // Status filtering
      if (status) {
        queryParams.append('status', status);
      }

      // Year range filtering
      if (yearRange) {
        if (yearRange.from) {
          queryParams.append('year_from', yearRange.from.toString());
        }
        if (yearRange.to) {
          queryParams.append('year_to', yearRange.to.toString());
        }
      }

      const authorizationHeader = this.base.generateOAuthHeaderPublic(
        oauthToken,
        oauthTokenSecret,
      );

      const options = {
        method: 'GET',
        headers: {
          Authorization: authorizationHeader,
          'User-Agent': this.base.getUserAgent(),
        },
      };

      const url = `users/${username}/collection/folders/${folderId}/releases?${queryParams.toString()}`;

      // DefaultHttpClient already retries 429s and throws a typed
      // RateLimitError, which handleError passes through untouched.
      return await this.base.requestPublic<CollectionResponse>(url, options);
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch collection');
    }
  }

  /**
   * Helper method to get collection items within a specific year range
   */
  async getCollectionByYearRange(
    startYear: number,
    endYear: number,
    baseParams: Omit<CollectionParams, 'yearRange'> = {},
  ): Promise<CollectionResponse> {
    return this.getCollection({
      ...baseParams,
      yearRange: {
        from: startYear,
        to: endYear,
      },
    });
  }

  /**
   * Helper method to get collection items by format
   */
  async getCollectionByFormat(
    format: string,
    baseParams: Omit<CollectionParams, 'format'> = {},
  ): Promise<CollectionResponse> {
    return this.getCollection({
      ...baseParams,
      format,
    });
  }

  /**
   * Helper method to get collection items sorted by a specific field
   */
  async getCollectionSorted(
    sortField: CollectionSortField,
    sortOrder: 'asc' | 'desc' = 'asc',
    baseParams: Omit<CollectionParams, 'sort' | 'sortOrder'> = {},
  ): Promise<CollectionResponse> {
    return this.getCollection({
      ...baseParams,
      sort: sortField,
      sortOrder,
    });
  }

  /**
   * Get user's collection folders
   * @param username Optional username. If not provided, uses authenticated user's identity
   * @throws {DiscogsError} If authentication fails or network error occurs
   */
  async getFolders(username?: string): Promise<FoldersResponse> {
    try {
      const tokenManager = this.base.getTokenManager();
      const [oauthToken, oauthTokenSecret] = await Promise.all([
        tokenManager.getAccessToken(),
        tokenManager.getAccessTokenSecret(),
      ]);

      if (!oauthToken || !oauthTokenSecret) {
        throw new DiscogsError(
          'Authentication required to access folders',
          ErrorCodes.AUTHENTICATION_ERROR,
        );
      }

      // If username not provided, get from stored identity
      if (!username) {
        const storage = this.base.getStorage();
        const userIdentityStr = await storage.getItem('userIdentity');
        if (userIdentityStr) {
          const userIdentity = JSON.parse(
            userIdentityStr,
          ) as UserIdentityResponse;
          username = userIdentity.username;
        }
      }

      if (!username) {
        throw new DiscogsError(
          'Username is required to fetch folders',
          ErrorCodes.CONFIGURATION_ERROR,
        );
      }

      const authHeader = this.base.generateOAuthHeaderPublic(
        oauthToken,
        oauthTokenSecret,
      );
      const options = {
        method: 'GET',
        headers: {
          Authorization: authHeader,
          'User-Agent': this.base.getUserAgent(),
        },
      };

      return await this.base.requestPublic<FoldersResponse>(
        `users/${username}/collection/folders`,
        options,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch collection folders');
    }
  }

  /**
   * Add a release to a collection folder
   * @param releaseId The ID of the release to add
   * @param folderId The target folder ID
   * @throws {DiscogsError} If authentication fails or network error occurs
   */
  async addToCollection(
    releaseId: number,
    folderId: number,
  ): Promise<CollectionModificationResponse> {
    try {
      const tokenManager = this.base.getTokenManager();
      const [oauthToken, oauthTokenSecret] = await Promise.all([
        tokenManager.getAccessToken(),
        tokenManager.getAccessTokenSecret(),
      ]);

      if (!oauthToken || !oauthTokenSecret) {
        throw new DiscogsError(
          'Authentication required to modify collection',
          ErrorCodes.AUTHENTICATION_ERROR,
        );
      }

      const storage = this.base.getStorage();
      const userIdentityStr = await storage.getItem('userIdentity');
      if (!userIdentityStr) {
        throw new DiscogsError(
          'User identity not found',
          ErrorCodes.AUTHENTICATION_ERROR,
        );
      }

      const userIdentity = JSON.parse(userIdentityStr) as UserIdentityResponse;
      const authHeader = this.base.generateOAuthHeaderPublic(
        oauthToken,
        oauthTokenSecret,
      );

      const options = {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'User-Agent': this.base.getUserAgent(),
          'Content-Length': '0',
        },
      };

      return await this.base.requestPublic<CollectionModificationResponse>(
        `users/${userIdentity.username}/collection/folders/${folderId}/releases/${releaseId}`,
        options,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to add release to collection');
    }
  }

  /**
   * Remove a release from a collection folder
   * @param releaseId The ID of the release to remove
   * @param folderId The folder ID to remove from
   * @throws {DiscogsError} If authentication fails or network error occurs
   */
  async removeFromCollection(
    releaseId: number,
    folderId: number,
  ): Promise<void> {
    try {
      const tokenManager = this.base.getTokenManager();
      const [oauthToken, oauthTokenSecret] = await Promise.all([
        tokenManager.getAccessToken(),
        tokenManager.getAccessTokenSecret(),
      ]);

      if (!oauthToken || !oauthTokenSecret) {
        throw new DiscogsError(
          'Authentication required to modify collection',
          ErrorCodes.AUTHENTICATION_ERROR,
        );
      }

      const storage = this.base.getStorage();
      const userIdentityStr = await storage.getItem('userIdentity');
      if (!userIdentityStr) {
        throw new DiscogsError(
          'User identity not found',
          ErrorCodes.AUTHENTICATION_ERROR,
        );
      }

      const userIdentity = JSON.parse(userIdentityStr) as UserIdentityResponse;
      const authHeader = this.base.generateOAuthHeaderPublic(
        oauthToken,
        oauthTokenSecret,
      );

      const options = {
        method: 'DELETE',
        headers: {
          Authorization: authHeader,
          'User-Agent': this.base.getUserAgent(),
        },
      };

      await this.base.requestPublic(
        `users/${userIdentity.username}/collection/folders/${folderId}/releases/${releaseId}`,
        options,
      );
    } catch (error) {
      throw this.handleError(error, 'Failed to remove release from collection');
    }
  }

  /**
   * Get the next page of collection items
   * @param currentResponse The current collection response
   * @param params The current collection parameters
   * @returns Promise with the next page of items, or null if no next page
   */
  async getNextPage(
    currentResponse: CollectionResponse,
    params: CollectionParams,
  ): Promise<CollectionResponse | null> {
    if (currentResponse.pagination.page >= currentResponse.pagination.pages) {
      return null;
    }

    return this.getCollection({
      ...params,
      page: (params.page || 1) + 1,
    });
  }

  /**
   * Get the previous page of collection items
   * @param currentResponse The current collection response
   * @param params The current collection parameters
   * @returns Promise with the previous page of items, or null if no previous page
   */
  async getPreviousPage(
    currentResponse: CollectionResponse,
    params: CollectionParams,
  ): Promise<CollectionResponse | null> {
    if (currentResponse.pagination.page <= 1) {
      return null;
    }

    return this.getCollection({
      ...params,
      page: (params.page || 1) - 1,
    });
  }

  private handleError(error: unknown, context: string): never {
    if (error instanceof DiscogsError) {
      throw error;
    }
    if (error instanceof Error) {
      throw new DiscogsError(
        `${context}: ${error.message}`,
        ErrorCodes.NETWORK_ERROR,
        error,
      );
    }
    throw new DiscogsError(
      `${context}: Unknown error occurred`,
      ErrorCodes.UNKNOWN_ERROR,
      error,
    );
  }
}
