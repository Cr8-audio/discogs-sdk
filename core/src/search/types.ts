import type { Pagination } from '../types/common';

export type SearchType = 'release' | 'master' | 'artist' | 'label';

export interface SearchParams {
  query?: string;
  type?: SearchType;
  title?: string;
  releaseTitle?: string;
  credit?: string;
  artist?: string;
  anv?: string;
  label?: string;
  genre?: string;
  style?: string;
  country?: string;
  year?: string;
  format?: string;
  catno?: string;
  barcode?: string;
  track?: string;
  submitter?: string;
  contributor?: string;
  /** 1-based page number. */
  page?: number;
  /** Results per page (Discogs caps this at 100). */
  perPage?: number;
}

export interface SearchResult {
  id: number;
  type: SearchType | string;
  title: string;
  uri?: string;
  resource_url?: string;
  thumb?: string;
  cover_image?: string;
  master_id?: number | null;
  master_url?: string | null;
  country?: string;
  year?: string;
  genre?: string[];
  style?: string[];
  label?: string[];
  format?: string[];
  barcode?: string[];
  catno?: string;
  community?: {
    want: number;
    have: number;
  };
}

/**
 * The full `/database/search` payload.
 *
 * Discogs returns `{ pagination, results }` — earlier versions of this SDK
 * typed the response as a bare array, which never matched the API.
 */
export interface SearchResponse {
  pagination: Pagination;
  results: SearchResult[];
}
