import {
  type Album,
  type AlbumSearchQuery,
  type Artist,
  type ArtistSearchQuery,
  type PlatformCapability,
  type PlatformLink,
  type Track,
  type TrackSearchQuery
} from "@music-link-finder/core";
import type { AdapterStatus, MusicPlatformAdapter, ResolvedEntity } from "./platform-adapter.js";

export class TidalAdapter implements MusicPlatformAdapter {
  readonly name = "tidal";
  readonly displayName = "TIDAL";
  readonly source = "api" as const;
  readonly capabilities: PlatformCapability[] = ["searchTrack", "searchAlbum", "searchArtist"];
  readonly enabled: boolean;
  readonly reason?: string;

  constructor(private readonly env: NodeJS.ProcessEnv) {
    this.enabled = Boolean(env.TIDAL_CLIENT_ID && env.TIDAL_CLIENT_SECRET);
    this.reason = this.enabled ? undefined : "Missing TIDAL credentials.";
  }

  getStatus(): AdapterStatus {
    return {
      platform: this.name,
      displayName: this.displayName,
      enabled: this.enabled,
      source: this.source,
      reason: this.reason,
      capabilities: this.capabilities
    };
  }

  async searchTrack(query: TrackSearchQuery): Promise<Track[]> {
    if (!this.enabled) return [];
    // Full API integration would go here. For MVP, we return an empty array
    // so it falls back to WebPlayer fallback links organically if needed,
    // or we can implement real fetch if endpoints are provided.
    return [];
  }

  async searchAlbum(query: AlbumSearchQuery): Promise<Album[]> {
    if (!this.enabled) return [];
    return [];
  }

  async searchArtist(query: ArtistSearchQuery): Promise<Artist[]> {
    if (!this.enabled) return [];
    return [];
  }
}
