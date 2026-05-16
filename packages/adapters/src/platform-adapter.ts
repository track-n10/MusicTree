import type {
  Album,
  AlbumSearchQuery,
  Artist,
  ArtistSearchQuery,
  EntityType,
  PlatformCapability,
  PlatformFailure,
  PlatformName,
  Track,
  TrackSearchQuery
} from "@music-link-finder/core";

export type AdapterStatus = {
  platform: PlatformName;
  displayName: string;
  enabled: boolean;
  source: "api" | "web-player";
  reason?: string;
  capabilities: PlatformCapability[];
};

export type ResolvedEntity = {
  platform: PlatformName;
  entityType: EntityType;
  entity: Track | Album | Artist;
};

export interface MusicPlatformAdapter {
  name: PlatformName;
  displayName: string;
  enabled: boolean;
  source: "api" | "web-player";
  reason?: string;
  capabilities: PlatformCapability[];
  getStatus(): AdapterStatus;
  searchTrack?(query: TrackSearchQuery): Promise<Track[]>;
  searchAlbum?(query: AlbumSearchQuery): Promise<Album[]>;
  searchArtist?(query: ArtistSearchQuery): Promise<Artist[]>;
  searchByIsrc?(isrc: string, market?: string): Promise<Track[]>;
  searchByUpc?(upc: string, market?: string): Promise<Album[]>;
  resolveUrl?(url: string, market?: string): Promise<ResolvedEntity | undefined>;
}

export class PlatformAdapterError extends Error {
  readonly failure: PlatformFailure;

  constructor(failure: PlatformFailure) {
    super(failure.message);
    this.failure = failure;
  }
}

export function adapterStatus(adapter: MusicPlatformAdapter): AdapterStatus {
  return {
    platform: adapter.name,
    displayName: adapter.displayName,
    enabled: adapter.enabled,
    source: adapter.source,
    reason: adapter.reason,
    capabilities: adapter.capabilities
  };
}
