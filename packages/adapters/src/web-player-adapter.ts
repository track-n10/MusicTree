import {
  buildMusicQuery,
  buildWebPlayerSearchUrl,
  getPlatformConfig,
  type Album,
  type AlbumSearchQuery,
  type Artist,
  type ArtistSearchQuery,
  type PlatformCapability,
  type PlatformLink,
  type PlatformName,
  type Track,
  type TrackSearchQuery
} from "@music-link-finder/core";
import type { AdapterStatus, MusicPlatformAdapter } from "./platform-adapter.js";

function link(platformName: PlatformName, entityType: "track" | "album" | "artist", query: string): PlatformLink {
  return {
    platformName,
    entityType,
    url: buildWebPlayerSearchUrl(platformName, entityType, query),
    source: "web-player",
    matchType: "search",
    extraMetadata: {
      query
    }
  };
}

export class WebPlayerAdapter implements MusicPlatformAdapter {
  readonly name: PlatformName;
  readonly displayName: string;
  readonly enabled = true;
  readonly source = "web-player" as const;
  readonly capabilities: PlatformCapability[] = ["searchTrack", "searchAlbum", "searchArtist"];
  readonly reason = "Uses the platform web player search page when API credentials are unavailable.";

  constructor(platformName: PlatformName) {
    const config = getPlatformConfig(platformName);
    this.name = config.name;
    this.displayName = config.displayName;
  }

  getStatus(): AdapterStatus {
    return {
      platform: this.name,
      displayName: this.displayName,
      enabled: true,
      source: "web-player",
      reason: this.reason,
      capabilities: this.capabilities
    };
  }

  async searchTrack(query: TrackSearchQuery): Promise<Track[]> {
    const musicQuery = buildMusicQuery(query.query, query.artist);
    return [
      {
        type: "track",
        title: query.query,
        mainArtist: query.artist ?? "Unknown artist",
        featuredArtists: [],
        links: [link(this.name, "track", musicQuery)],
        confidence: 0.35
      }
    ];
  }

  async searchAlbum(query: AlbumSearchQuery): Promise<Album[]> {
    const musicQuery = buildMusicQuery(query.query, query.artist);
    return [
      {
        type: "album",
        title: query.query,
        mainArtist: query.artist ?? "Unknown artist",
        releaseType: "unknown",
        links: [link(this.name, "album", musicQuery)],
        confidence: 0.35
      }
    ];
  }

  async searchArtist(query: ArtistSearchQuery): Promise<Artist[]> {
    return [
      {
        type: "artist",
        name: query.query,
        links: [link(this.name, "artist", query.query)],
        confidence: 0.35
      }
    ];
  }
}

export function createWebPlayerLink(platformName: PlatformName, entityType: "track" | "album" | "artist", query: string): PlatformLink {
  return link(platformName, entityType, query);
}
