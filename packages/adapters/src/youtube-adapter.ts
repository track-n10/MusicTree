import {
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
import { fetchJson, toQueryString } from "./http.js";
import type { AdapterStatus, MusicPlatformAdapter, ResolvedEntity } from "./platform-adapter.js";
import { detectPlatformUrl } from "./url-detection.js";

type YouTubeSearchItem = {
  id: {
    kind?: string;
    videoId?: string;
    channelId?: string;
    playlistId?: string;
  };
  snippet: {
    title?: string;
    channelTitle?: string;
    publishedAt?: string;
    thumbnails?: Record<string, { url: string; width?: number; height?: number }>;
  };
};
type YouTubeSearchResponse = { items?: YouTubeSearchItem[] };
type YouTubeVideoResponse = {
  items?: Array<{
    id: string;
    snippet: YouTubeSearchItem["snippet"];
    contentDetails?: { duration?: string };
  }>;
};

export class YouTubeAdapter implements MusicPlatformAdapter {
  readonly displayName: string;
  readonly source = "api" as const;
  readonly capabilities: PlatformCapability[] = ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"];
  readonly enabled: boolean;
  readonly reason?: string;

  constructor(
    private readonly env: NodeJS.ProcessEnv,
    readonly name: Extract<PlatformName, "youtube" | "youtubeMusic"> = "youtube"
  ) {
    this.displayName = name === "youtubeMusic" ? "YouTube Music" : "YouTube";
    this.enabled = Boolean(env.YOUTUBE_API_KEY);
    this.reason = this.enabled ? undefined : "Missing YOUTUBE_API_KEY.";
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
    const term = [query.query, query.artist, this.name === "youtubeMusic" ? "" : "official audio"].filter(Boolean).join(" ");
    const data = await this.search(term, "video", query.market);
    return (data.items ?? []).map((item) => this.mapVideo(item));
  }

  async searchAlbum(query: AlbumSearchQuery): Promise<Album[]> {
    const term = [query.query, query.artist, "album"].filter(Boolean).join(" ");
    const data = await this.search(term, "playlist", query.market);
    return (data.items ?? []).map((item) => this.mapPlaylist(item));
  }

  async searchArtist(query: ArtistSearchQuery): Promise<Artist[]> {
    const data = await this.search(query.query, "channel", query.market);
    return (data.items ?? []).map((item) => this.mapChannel(item));
  }

  async resolveUrl(url: string): Promise<ResolvedEntity | undefined> {
    const detected = detectPlatformUrl(url);
    if (!detected || detected.platformName !== this.name || !detected.platformEntityId) return undefined;

    if (detected.entityType === "artist") {
      return {
        platform: this.name,
        entityType: "artist",
        entity: {
          id: detected.platformEntityId,
          type: "artist",
          name: detected.platformEntityId,
          links: [this.link("artist", url, detected.platformEntityId)],
          confidence: 0.55
        }
      };
    }

    const data = await fetchJson<YouTubeVideoResponse>(
      `https://www.googleapis.com/youtube/v3/videos?${toQueryString({
        key: this.env.YOUTUBE_API_KEY,
        part: "snippet,contentDetails",
        id: detected.platformEntityId
      })}`
    );
    const item = data.items?.[0];
    if (!item) return undefined;

    return {
      platform: this.name,
      entityType: "track",
      entity: {
        id: item.id,
        type: "track",
        title: item.snippet.title ?? "Unknown video",
        mainArtist: item.snippet.channelTitle ?? "Unknown artist",
        featuredArtists: [],
        durationMs: parseIsoDuration(item.contentDetails?.duration),
        releaseDate: item.snippet.publishedAt?.slice(0, 10),
        coverImageUrl: selectThumbnail(item.snippet.thumbnails),
        links: [this.link("track", this.videoUrl(item.id), item.id)],
        confidence: 0.72
      }
    };
  }

  private async search(q: string, type: "video" | "playlist" | "channel", market?: string): Promise<YouTubeSearchResponse> {
    return fetchJson<YouTubeSearchResponse>(
      `https://www.googleapis.com/youtube/v3/search?${toQueryString({
        key: this.env.YOUTUBE_API_KEY,
        part: "snippet",
        maxResults: 10,
        q,
        type,
        regionCode: market
      })}`
    );
  }

  private mapVideo(item: YouTubeSearchItem): Track {
    const id = item.id.videoId ?? "";
    return {
      id,
      type: "track",
      title: item.snippet.title ?? "Unknown video",
      mainArtist: item.snippet.channelTitle ?? "Unknown artist",
      featuredArtists: [],
      releaseDate: item.snippet.publishedAt?.slice(0, 10),
      coverImageUrl: selectThumbnail(item.snippet.thumbnails),
      links: [this.link("track", this.videoUrl(id), id)],
      confidence: 0.68
    };
  }

  private mapPlaylist(item: YouTubeSearchItem): Album {
    const id = item.id.playlistId ?? "";
    return {
      id,
      type: "album",
      title: item.snippet.title ?? "Unknown playlist",
      mainArtist: item.snippet.channelTitle ?? "Unknown artist",
      releaseType: "unknown",
      releaseDate: item.snippet.publishedAt?.slice(0, 10),
      coverImageUrl: selectThumbnail(item.snippet.thumbnails),
      links: [this.link("album", this.playlistUrl(id), id)],
      confidence: 0.55
    };
  }

  private mapChannel(item: YouTubeSearchItem): Artist {
    const id = item.id.channelId ?? "";
    return {
      id,
      type: "artist",
      name: item.snippet.title ?? item.snippet.channelTitle ?? "Unknown channel",
      avatarUrl: selectThumbnail(item.snippet.thumbnails),
      links: [this.link("artist", this.channelUrl(id), id)],
      confidence: 0.7
    };
  }

  private link(entityType: "track" | "album" | "artist", url: string, id: string): PlatformLink {
    return {
      platformName: this.name,
      entityType,
      url,
      platformEntityId: id,
      source: "api",
      matchType: "candidate"
    };
  }

  private videoUrl(id: string): string {
    return this.name === "youtubeMusic" ? `https://music.youtube.com/watch?v=${id}` : `https://www.youtube.com/watch?v=${id}`;
  }

  private playlistUrl(id: string): string {
    return this.name === "youtubeMusic" ? `https://music.youtube.com/playlist?list=${id}` : `https://www.youtube.com/playlist?list=${id}`;
  }

  private channelUrl(id: string): string {
    return this.name === "youtubeMusic" ? `https://music.youtube.com/channel/${id}` : `https://www.youtube.com/channel/${id}`;
  }
}

function selectThumbnail(thumbnails?: Record<string, { url: string; width?: number; height?: number }>): string | undefined {
  return Object.values(thumbnails ?? {}).sort((left, right) => (right.width ?? 0) - (left.width ?? 0))[0]?.url;
}

function parseIsoDuration(value?: string): number | undefined {
  if (!value) return undefined;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return undefined;

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return ((hours * 60 + minutes) * 60 + seconds) * 1000;
}
