import {
  parseReleaseType,
  type Album,
  type AlbumSearchQuery,
  type Artist,
  type ArtistSearchQuery,
  type PlatformCapability,
  type PlatformLink,
  type Track,
  type TrackSearchQuery
} from "@music-link-finder/core";
import { fetchJson, toQueryString } from "./http.js";
import type { AdapterStatus, MusicPlatformAdapter, ResolvedEntity } from "./platform-adapter.js";
import { detectPlatformUrl } from "./url-detection.js";

type ITunesItem = {
  wrapperType?: string;
  kind?: string;
  artistId?: number;
  collectionId?: number;
  trackId?: number;
  artistName?: string;
  collectionName?: string;
  trackName?: string;
  collectionCensoredName?: string;
  artistViewUrl?: string;
  collectionViewUrl?: string;
  trackViewUrl?: string;
  artworkUrl100?: string;
  releaseDate?: string;
  trackTimeMillis?: number;
  trackCount?: number;
  trackExplicitness?: string;
  collectionExplicitness?: string;
  primaryGenreName?: string;
};
type ITunesResponse = { resultCount: number; results: ITunesItem[] };

type AppleArtwork = { url?: string };
type AppleResource<T> = { id: string; type: string; href?: string; attributes: T };
type AppleSearchResponse = {
  results?: {
    songs?: { data?: AppleResource<AppleSongAttributes>[] };
    albums?: { data?: AppleResource<AppleAlbumAttributes>[] };
    artists?: { data?: AppleResource<AppleArtistAttributes>[] };
  };
  data?: Array<AppleResource<AppleSongAttributes | AppleAlbumAttributes | AppleArtistAttributes>>;
};
type AppleSongAttributes = {
  name?: string;
  artistName?: string;
  albumName?: string;
  durationInMillis?: number;
  isrc?: string;
  releaseDate?: string;
  artwork?: AppleArtwork;
  url?: string;
  contentRating?: string;
};
type AppleAlbumAttributes = {
  name?: string;
  artistName?: string;
  upc?: string;
  releaseDate?: string;
  trackCount?: number;
  isSingle?: boolean;
  artwork?: AppleArtwork;
  url?: string;
  contentRating?: string;
};
type AppleArtistAttributes = {
  name?: string;
  url?: string;
  artwork?: AppleArtwork;
};

export class AppleMusicAdapter implements MusicPlatformAdapter {
  readonly name = "appleMusic" as const;
  readonly displayName = "Apple Music";
  readonly source = "api" as const;
  readonly enabled = true;
  readonly capabilities: PlatformCapability[] = ["searchTrack", "searchAlbum", "searchArtist", "searchByIsrc", "searchByUpc", "resolveUrl"];
  readonly reason?: string;

  private readonly developerToken?: string;
  private readonly storefront: string;

  constructor(private readonly env: NodeJS.ProcessEnv) {
    this.developerToken = env.APPLE_MUSIC_DEVELOPER_TOKEN;
    this.storefront = env.APPLE_MUSIC_STOREFRONT ?? "us";
    this.reason = this.developerToken ? undefined : "Using public iTunes Search API because APPLE_MUSIC_DEVELOPER_TOKEN is not set.";
  }

  getStatus(): AdapterStatus {
    return {
      platform: this.name,
      displayName: this.displayName,
      enabled: true,
      source: this.source,
      reason: this.reason,
      capabilities: this.capabilities
    };
  }

  async searchByIsrc(isrc: string): Promise<Track[]> {
    if (this.developerToken) {
      const data = await this.appleGet<AppleSearchResponse>(`songs?filter[isrc]=${encodeURIComponent(isrc)}`);
      return ((data.data ?? []) as Array<AppleResource<AppleSongAttributes>>).map((song) => this.mapAppleSong(song));
    }

    const data = await this.itunes("lookup", { isrc });
    return data.results.filter((item) => item.kind === "song").map((item) => this.mapITunesTrack(item));
  }

  async searchByUpc(upc: string): Promise<Album[]> {
    if (this.developerToken) {
      const data = await this.appleGet<AppleSearchResponse>(`albums?filter[upc]=${encodeURIComponent(upc)}`);
      return ((data.data ?? []) as Array<AppleResource<AppleAlbumAttributes>>).map((album) => this.mapAppleAlbum(album));
    }

    const data = await this.itunes("lookup", { upc, entity: "album" });
    return data.results.filter((item) => item.wrapperType === "collection").map((item) => this.mapITunesAlbum(item));
  }

  async searchTrack(query: TrackSearchQuery): Promise<Track[]> {
    const term = [query.query, query.artist].filter(Boolean).join(" ");
    if (this.developerToken) {
      const data = await this.appleSearch(term, "songs");
      return (data.results?.songs?.data ?? []).map((song) => this.mapAppleSong(song));
    }

    const data = await this.itunes("search", { term, entity: "song", limit: 10, country: query.market ?? "US" });
    return data.results.filter((item) => item.kind === "song").map((item) => this.mapITunesTrack(item));
  }

  async searchAlbum(query: AlbumSearchQuery): Promise<Album[]> {
    const term = [query.query, query.artist].filter(Boolean).join(" ");
    if (this.developerToken) {
      const data = await this.appleSearch(term, "albums");
      return (data.results?.albums?.data ?? []).map((album) => this.mapAppleAlbum(album));
    }

    const data = await this.itunes("search", { term, entity: "album", limit: 10, country: query.market ?? "US" });
    return data.results.filter((item) => item.wrapperType === "collection").map((item) => this.mapITunesAlbum(item));
  }

  async searchArtist(query: ArtistSearchQuery): Promise<Artist[]> {
    if (this.developerToken) {
      const data = await this.appleSearch(query.query, "artists");
      return (data.results?.artists?.data ?? []).map((artist) => this.mapAppleArtist(artist));
    }

    const data = await this.itunes("search", { term: query.query, entity: "musicArtist", limit: 10, country: query.market ?? "US" });
    return data.results.filter((item) => item.wrapperType === "artist").map((item) => this.mapITunesArtist(item));
  }

  async resolveUrl(url: string, market = "US"): Promise<ResolvedEntity | undefined> {
    const detected = detectPlatformUrl(url);
    if (!detected || detected.platformName !== this.name || !detected.platformEntityId) return undefined;

    const data = await this.itunes("lookup", { id: detected.platformEntityId, country: market });
    const item = data.results[0];
    if (!item) return undefined;

    if (detected.entityType === "track" || item.kind === "song") {
      return { platform: this.name, entityType: "track", entity: this.mapITunesTrack(item) };
    }

    if (detected.entityType === "album" || item.wrapperType === "collection") {
      return { platform: this.name, entityType: "album", entity: this.mapITunesAlbum(item) };
    }

    return { platform: this.name, entityType: "artist", entity: this.mapITunesArtist(item) };
  }

  private async appleSearch(term: string, types: "songs" | "albums" | "artists"): Promise<AppleSearchResponse> {
    return this.appleGet<AppleSearchResponse>(`search?${toQueryString({ term, types, limit: 10 })}`);
  }

  private async appleGet<T>(path: string): Promise<T> {
    return fetchJson<T>(`https://api.music.apple.com/v1/catalog/${this.storefront}/${path}`, {
      headers: {
        Authorization: `Bearer ${this.developerToken}`
      }
    });
  }

  private async itunes(action: "lookup" | "search", params: Record<string, string | number | undefined>): Promise<ITunesResponse> {
    return fetchJson<ITunesResponse>(`https://itunes.apple.com/${action}?${toQueryString(params)}`);
  }

  private mapAppleSong(song: AppleResource<AppleSongAttributes>): Track {
    const attrs = song.attributes;
    return {
      id: song.id,
      type: "track",
      title: attrs.name ?? "Unknown track",
      mainArtist: attrs.artistName ?? "Unknown artist",
      featuredArtists: [],
      isrc: attrs.isrc,
      albumTitle: attrs.albumName,
      durationMs: attrs.durationInMillis,
      releaseDate: attrs.releaseDate,
      coverImageUrl: appleArtwork(attrs.artwork?.url),
      explicit: attrs.contentRating === "explicit",
      links: [appleLink("track", attrs.url, song.id)],
      confidence: attrs.isrc ? 0.94 : 0.82
    };
  }

  private mapAppleAlbum(album: AppleResource<AppleAlbumAttributes>): Album {
    const attrs = album.attributes;
    return {
      id: album.id,
      type: "album",
      title: attrs.name ?? "Unknown album",
      mainArtist: attrs.artistName ?? "Unknown artist",
      upc: attrs.upc,
      releaseType: parseReleaseType(attrs.isSingle ? "single" : "album", attrs.trackCount),
      releaseDate: attrs.releaseDate,
      coverImageUrl: appleArtwork(attrs.artwork?.url),
      explicit: attrs.contentRating === "explicit",
      links: [appleLink("album", attrs.url, album.id)],
      confidence: attrs.upc ? 0.94 : 0.82
    };
  }

  private mapAppleArtist(artist: AppleResource<AppleArtistAttributes>): Artist {
    return {
      id: artist.id,
      type: "artist",
      name: artist.attributes.name ?? "Unknown artist",
      avatarUrl: appleArtwork(artist.attributes.artwork?.url),
      links: [appleLink("artist", artist.attributes.url, artist.id)],
      confidence: 0.86
    };
  }

  private mapITunesTrack(item: ITunesItem): Track {
    const id = String(item.trackId ?? item.collectionId ?? "");
    return {
      id,
      type: "track",
      title: item.trackName ?? item.collectionName ?? "Unknown track",
      mainArtist: item.artistName ?? "Unknown artist",
      featuredArtists: [],
      albumTitle: item.collectionName,
      durationMs: item.trackTimeMillis,
      releaseDate: item.releaseDate?.slice(0, 10),
      coverImageUrl: upgradeITunesArtwork(item.artworkUrl100),
      explicit: item.trackExplicitness === "explicit",
      links: [appleLink("track", item.trackViewUrl, id)],
      confidence: 0.78
    };
  }

  private mapITunesAlbum(item: ITunesItem): Album {
    const id = String(item.collectionId ?? "");
    return {
      id,
      type: "album",
      title: item.collectionName ?? item.collectionCensoredName ?? "Unknown album",
      mainArtist: item.artistName ?? "Unknown artist",
      releaseType: parseReleaseType("album", item.trackCount),
      releaseDate: item.releaseDate?.slice(0, 10),
      coverImageUrl: upgradeITunesArtwork(item.artworkUrl100),
      explicit: item.collectionExplicitness === "explicit",
      links: [appleLink("album", item.collectionViewUrl, id)],
      confidence: 0.78
    };
  }

  private mapITunesArtist(item: ITunesItem): Artist {
    const id = String(item.artistId ?? "");
    return {
      id,
      type: "artist",
      name: item.artistName ?? "Unknown artist",
      links: [appleLink("artist", item.artistViewUrl, id)],
      confidence: 0.78
    };
  }
}

function appleArtwork(template?: string): string | undefined {
  return template?.replace("{w}", "1200").replace("{h}", "1200");
}

function upgradeITunesArtwork(url?: string): string | undefined {
  return url?.replace("100x100bb", "1200x1200bb");
}

function appleLink(entityType: "track" | "album" | "artist", url: string | undefined, id: string): PlatformLink {
  return {
    platformName: "appleMusic",
    entityType,
    url: url ?? `https://music.apple.com/search?term=${encodeURIComponent(id)}`,
    platformEntityId: id,
    source: "api",
    matchType: "exact"
  };
}
