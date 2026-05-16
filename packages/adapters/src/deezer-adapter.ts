import { type PlatformCapability, type PlatformLink, type Track } from "@music-link-finder/core";
import type { AdapterStatus, MusicPlatformAdapter } from "./platform-adapter.js";

type DeezerApiError = { error?: { type?: string; message?: string; code?: number } };
type DeezerTrackPayload = {
  id?: number;
  title?: string;
  link?: string;
  duration?: number;
  isrc?: string;
  release_date?: string;
  explicit_lyrics?: boolean;
  artist?: { id?: number; name?: string };
  album?: { id?: number; title?: string; cover_medium?: string; release_date?: string };
};

export class DeezerAdapter implements MusicPlatformAdapter {
  readonly name = "deezer" as const;
  readonly displayName = "Deezer";
  readonly source = "api" as const;
  readonly enabled = true;
  readonly capabilities: PlatformCapability[] = ["searchByIsrc"];

  getStatus(): AdapterStatus {
    return {
      platform: this.name,
      displayName: this.displayName,
      enabled: true,
      source: this.source,
      reason: "Uses Deezer's public track-by-ISRC endpoint (no API key).",
      capabilities: this.capabilities
    };
  }

  async searchByIsrc(isrc: string): Promise<Track[]> {
    const url = `https://api.deezer.com/track/isrc:${encodeURIComponent(isrc)}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: "application/json" }
      });
      const data = (await response.json()) as DeezerApiError & DeezerTrackPayload;

      if (!response.ok || data.error || typeof data.id !== "number" || !data.title || !data.link) {
        return [];
      }

      return [this.mapTrack(data, isrc)];
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  }

  private mapTrack(row: DeezerTrackPayload, fallbackIsrc: string): Track {
    const id = String(row.id);
    const mainArtist = row.artist?.name ?? "Unknown artist";
    return {
      id,
      type: "track",
      title: row.title!,
      mainArtist,
      featuredArtists: [],
      isrc: row.isrc ?? fallbackIsrc,
      albumTitle: row.album?.title,
      durationMs: typeof row.duration === "number" ? Math.round(row.duration * 1000) : undefined,
      releaseDate: row.release_date?.slice(0, 10) ?? row.album?.release_date?.slice(0, 10),
      coverImageUrl: row.album?.cover_medium,
      explicit: row.explicit_lyrics,
      links: [deezerLink(row.link!, id)],
      confidence: row.isrc ? 0.93 : 0.88
    };
  }
}

function deezerLink(url: string, id: string): PlatformLink {
  return {
    platformName: "deezer",
    entityType: "track",
    url,
    platformEntityId: id,
    source: "api",
    matchType: "exact"
  };
}
