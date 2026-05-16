import {
  dedupeStrings,
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

type SpotifyImage = { url: string; width?: number; height?: number };
type SpotifyArtist = { id: string; name: string; external_urls?: { spotify?: string }; followers?: { total?: number }; images?: SpotifyImage[] };
type SpotifyAlbumSummary = {
  id: string;
  name: string;
  album_type?: string;
  total_tracks?: number;
  release_date?: string;
  images?: SpotifyImage[];
  artists?: SpotifyArtist[];
  external_urls?: { spotify?: string };
  external_ids?: { upc?: string };
};
type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms?: number;
  explicit?: boolean;
  popularity?: number;
  external_ids?: { isrc?: string };
  external_urls?: { spotify?: string };
  artists?: SpotifyArtist[];
  album?: SpotifyAlbumSummary;
};
type SpotifySearchResponse = {
  tracks?: { items?: SpotifyTrack[] };
  albums?: { items?: SpotifyAlbumSummary[] };
  artists?: { items?: SpotifyArtist[] };
};
type SpotifyAlbum = SpotifyAlbumSummary & {
  tracks?: {
    items?: Array<{
      name: string;
      duration_ms?: number;
      disc_number?: number;
      track_number?: number;
      external_ids?: { isrc?: string };
    }>;
  };
};
type TokenResponse = { access_token: string; expires_in: number };

export class SpotifyAdapter implements MusicPlatformAdapter {
  readonly name = "spotify" as const;
  readonly displayName = "Spotify";
  readonly source = "api" as const;
  readonly capabilities: PlatformCapability[] = ["searchTrack", "searchAlbum", "searchArtist", "searchByIsrc", "searchByUpc", "resolveUrl"];
  readonly enabled: boolean;
  readonly reason?: string;

  private token?: { value: string; expiresAt: number };

  constructor(private readonly env: NodeJS.ProcessEnv) {
    this.enabled = Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
    this.reason = this.enabled ? undefined : "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET.";
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

  async searchByIsrc(isrc: string, market = "US"): Promise<Track[]> {
    let data = await this.search("track", `isrc:${isrc}`, market);
    let items = data.tracks?.items ?? [];
    if (items.length === 0) {
      data = await this.search("track", `isrc:${isrc}`);
      items = data.tracks?.items ?? [];
    }
    return items.map((track) => this.mapTrack(track));
  }

  async searchByUpc(upc: string, market = "US"): Promise<Album[]> {
    const data = await this.search("album", `upc:${upc}`, market);
    const summaries = data.albums?.items ?? [];
    return Promise.all(summaries.map((album) => this.getAlbum(album.id, market).then((full) => this.mapAlbum(full))));
  }

  async searchTrack(query: TrackSearchQuery): Promise<Track[]> {
    const q = query.artist ? `track:${query.query} artist:${query.artist}` : query.query;
    const data = await this.search("track", q, query.market ?? "US");
    return (data.tracks?.items ?? []).map((track) => this.mapTrack(track));
  }

  async searchAlbum(query: AlbumSearchQuery): Promise<Album[]> {
    const q = query.artist ? `album:${query.query} artist:${query.artist}` : query.query;
    const data = await this.search("album", q, query.market ?? "US");
    const summaries = data.albums?.items ?? [];
    return Promise.all(summaries.slice(0, 5).map((album) => this.getAlbum(album.id, query.market ?? "US").then((full) => this.mapAlbum(full))));
  }

  async searchArtist(query: ArtistSearchQuery): Promise<Artist[]> {
    const data = await this.search("artist", query.query, query.market ?? "US");
    return (data.artists?.items ?? []).map((artist) => this.mapArtist(artist));
  }

  async resolveUrl(url: string, market = "US"): Promise<ResolvedEntity | undefined> {
    const detected = detectPlatformUrl(url);
    if (!detected || detected.platformName !== this.name || !detected.platformEntityId) return undefined;

    if (detected.entityType === "track") {
      return { platform: this.name, entityType: "track", entity: this.mapTrack(await this.getTrack(detected.platformEntityId, market)) };
    }

    if (detected.entityType === "album") {
      return { platform: this.name, entityType: "album", entity: this.mapAlbum(await this.getAlbum(detected.platformEntityId, market)) };
    }

    return { platform: this.name, entityType: "artist", entity: this.mapArtist(await this.getArtist(detected.platformEntityId)) };
  }

  private async getToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;

    const body = new URLSearchParams({ grant_type: "client_credentials" });
    const auth = Buffer.from(`${this.env.SPOTIFY_CLIENT_ID}:${this.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const token = await fetchJson<TokenResponse>("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    this.token = {
      value: token.access_token,
      expiresAt: Date.now() + token.expires_in * 1000
    };
    return token.access_token;
  }

  private async search(type: "track" | "album" | "artist", q: string, market?: string): Promise<SpotifySearchResponse> {
    const token = await this.getToken();
    const params = toQueryString({
      q,
      type,
      limit: 10,
      ...(market ? { market } : {})
    });
    return fetchJson<SpotifySearchResponse>(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  private async getTrack(id: string, market: string): Promise<SpotifyTrack> {
    const token = await this.getToken();
    return fetchJson<SpotifyTrack>(`https://api.spotify.com/v1/tracks/${id}?${toQueryString({ market })}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  private async getAlbum(id: string, market: string): Promise<SpotifyAlbum> {
    const token = await this.getToken();
    return fetchJson<SpotifyAlbum>(`https://api.spotify.com/v1/albums/${id}?${toQueryString({ market })}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  private async getArtist(id: string): Promise<SpotifyArtist> {
    const token = await this.getToken();
    return fetchJson<SpotifyArtist>(`https://api.spotify.com/v1/artists/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  private mapTrack(track: SpotifyTrack): Track {
    const artists = track.artists ?? [];
    const mainArtist = artists[0]?.name ?? "Unknown artist";
    return {
      id: track.id,
      type: "track",
      title: track.name,
      mainArtist,
      featuredArtists: dedupeStrings(artists.slice(1).map((artist) => artist.name)),
      isrc: track.external_ids?.isrc,
      albumTitle: track.album?.name,
      durationMs: track.duration_ms,
      releaseDate: track.album?.release_date,
      coverImageUrl: selectImage(track.album?.images),
      explicit: track.explicit,
      links: [spotifyLink("track", track.external_urls?.spotify, track.id)],
      confidence: track.external_ids?.isrc ? 0.96 : 0.86
    };
  }

  private mapAlbum(album: SpotifyAlbum): Album {
    const mainArtist = album.artists?.[0]?.name ?? "Unknown artist";
    return {
      id: album.id,
      type: "album",
      title: album.name,
      mainArtist,
      upc: album.external_ids?.upc,
      releaseType: parseReleaseType(album.album_type, album.total_tracks),
      releaseDate: album.release_date,
      coverImageUrl: selectImage(album.images),
      tracklist: album.tracks?.items?.map((track) => ({
        title: track.name,
        durationMs: track.duration_ms,
        discNumber: track.disc_number,
        trackNumber: track.track_number,
        isrc: track.external_ids?.isrc
      })),
      links: [spotifyLink("album", album.external_urls?.spotify, album.id)],
      confidence: album.external_ids?.upc ? 0.96 : 0.84
    };
  }

  private mapArtist(artist: SpotifyArtist): Artist {
    return {
      id: artist.id,
      type: "artist",
      name: artist.name,
      avatarUrl: selectImage(artist.images),
      followers: artist.followers?.total,
      links: [spotifyLink("artist", artist.external_urls?.spotify, artist.id)],
      confidence: 0.9
    };
  }
}

function selectImage(images?: SpotifyImage[]): string | undefined {
  return [...(images ?? [])].sort((left, right) => (right.width ?? 0) - (left.width ?? 0))[0]?.url;
}

function spotifyLink(entityType: "track" | "album" | "artist", url: string | undefined, id: string): PlatformLink {
  return {
    platformName: "spotify",
    entityType,
    url: url ?? `https://open.spotify.com/${entityType}/${id}`,
    platformEntityId: id,
    source: "api",
    matchType: "exact"
  };
}
