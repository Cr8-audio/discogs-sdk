import type { Pagination } from '../types/common';

export type CollectionResponse = {
  pagination: Pagination;
  releases: Release[];
};

export type Release = {
  id: number;
  instance_id: number;
  folder_id: number;
  rating: number;
  basic_information: BasicInformation;
  notes: Note[];
};

export type BasicInformation = {
  id: number;
  title: string;
  year: number;
  resource_url: string;
  thumb: string;
  cover_image: string;
  formats: Format[];
  labels: Label[];
  artists: Artist[];
  genres: string[];
  styles: string[];
};

export type Format = {
  qty: string;
  descriptions: string[];
  name: string;
};

export type Label = {
  resource_url: string;
  entity_type: string;
  catno: string;
  id: number;
  name: string;
};

export type Artist = {
  id: number;
  name: string;
  join: string;
  resource_url: string;
  anv: string;
  tracks: string;
  role: string;
};

export type Note = {
  field_id: number;
  value: string;
};

export type CollectionSortField =
  | 'label'
  | 'artist'
  | 'title'
  | 'catno'
  | 'format'
  | 'rating'
  | 'added'
  | 'year';

export const CollectionSortFields = {
  LABEL: 'label',
  ARTIST: 'artist',
  TITLE: 'title',
  CATALOG_NUMBER: 'catno',
  FORMAT: 'format',
  RATING: 'rating',
  ADDED: 'added',
  YEAR: 'year',
} as const satisfies Record<string, CollectionSortField>;

export interface CollectionParams {
  username?: string;
  folderId?: number;
  page?: number;
  perPage?: number;
  sort?: CollectionSortField;
  sortOrder?: 'asc' | 'desc';
  format?: string;
  status?: 'All' | 'Available' | 'For Trade' | 'Not For Sale';
  yearRange?: {
    from?: number;
    to?: number;
  };
}

export interface FoldersResponse {
  folders: Folder[];
}

export interface Folder {
  id: number;
  name: string;
  count: number;
  resource_url: string;
}

export interface CollectionModificationResponse {
  instance_id: number;
  resource_url: string;
}
