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

export class AmazonMusicAdapter implements MusicPlatformAdapter {
  readonly name = "amazonMusic";
  readonly displayName = "Amazon Music";
  readonly source = "api" as const;
  readonly capabilities: PlatformCapability[] = ["searchTrack", "searchAlbum", "searchArtist"];
  readonly enabled: boolean;
  readonly reason?: string;

  constructor(private readonly env: NodeJS.ProcessEnv) {
    this.enabled = Boolean(env.AMAZON_MUSIC_API_KEY);
    this.reason = this.enabled ? undefined : "Missing AMAZON_MUSIC_API_KEY.";
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
