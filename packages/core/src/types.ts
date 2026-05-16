import type { EntityType, PlatformName } from "./platforms.js";

export type ReleaseType = "single" | "ep" | "album" | "compilation" | "unknown";

export type LinkSource = "api" | "web-player";

export type MatchType = "exact" | "candidate" | "search";

export type PlatformLink = {
  platformName: PlatformName;
  entityType: EntityType;
  url: string;
  platformEntityId?: string;
  source: LinkSource;
  matchType: MatchType;
  extraMetadata?: Record<string, unknown>;
};

export type Track = {
  id?: string;
  type: "track";
  title: string;
  mainArtist: string;
  featuredArtists: string[];
  isrc?: string;
  albumTitle?: string;
  durationMs?: number;
  releaseDate?: string;
  coverImageUrl?: string;
  explicit?: boolean;
  links: PlatformLink[];
  confidence: number;
};

export type AlbumTrack = {
  title: string;
  durationMs?: number;
  discNumber?: number;
  trackNumber?: number;
  isrc?: string;
};

export type Album = {
  id?: string;
  type: "album";
  title: string;
  mainArtist: string;
  upc?: string;
  releaseType: ReleaseType;
  releaseDate?: string;
  coverImageUrl?: string;
  explicit?: boolean;
  tracklist?: AlbumTrack[];
  links: PlatformLink[];
  confidence: number;
};

export type Artist = {
  id?: string;
  type: "artist";
  name: string;
  normalizedName?: string;
  avatarUrl?: string;
  followers?: number;
  monthlyListeners?: number;
  links: PlatformLink[];
  confidence: number;
};

export type SearchResult = Track | Album | Artist;

export type PlatformFailure = {
  platform: PlatformName | "system";
  code: string;
  message: string;
};

export type SearchMeta = {
  durationMs: number;
  cached: boolean;
  fallbackUsed: boolean;
};

export type SearchResponse<T extends SearchResult = SearchResult> = {
  query: Record<string, unknown>;
  results: T[];
  failures: PlatformFailure[];
  meta: SearchMeta;
};

export type TrackSearchQuery = {
  query: string;
  artist?: string;
  releaseType?: "track" | "album";
  market?: string;
};

export type AlbumSearchQuery = {
  query: string;
  artist?: string;
  market?: string;
};

export type ArtistSearchQuery = {
  query: string;
  market?: string;
};

export type UrlResolveResult = {
  platformName: PlatformName;
  entityType: EntityType;
  platformEntityId?: string;
  url: string;
};
