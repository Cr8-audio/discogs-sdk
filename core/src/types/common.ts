/**
 * Types shared across Discogs resources.
 */

export interface PaginationUrls {
  first?: string;
  prev?: string;
  next?: string;
  last?: string;
}

export interface Pagination {
  per_page: number;
  pages: number;
  page: number;
  items: number;
  urls: PaginationUrls;
}
