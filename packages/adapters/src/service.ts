import {
  buildMusicQuery,
  normalizeCode,
  normalizeText,
  platformConfigs,
  platformNames,
  scoreAlbumCandidate,
  scoreArtistCandidate,
  scoreTrackCandidate,
  sortByConfidence,
  type Album,
  type Artist,
  type PlatformFailure,
  type PlatformLink,
  type PlatformName,
  type SearchResponse,
  type SearchResult,
  type Track
} from "@music-link-finder/core";
import { AppleMusicAdapter } from "./apple-music-adapter.js";
import { createRuntimeConfig, type RuntimeConfig } from "./config.js";
import type { AdapterStatus, MusicPlatformAdapter, ResolvedEntity } from "./platform-adapter.js";
import { SpotifyAdapter } from "./spotify-adapter.js";
import { detectPlatformUrl } from "./url-detection.js";
import { createWebPlayerLink, WebPlayerAdapter } from "./web-player-adapter.js";
import { YouTubeAdapter } from "./youtube-adapter.js";
import { TidalAdapter } from "./tidal-adapter.js";
import { AmazonMusicAdapter } from "./amazon-music-adapter.js";
import { SoundCloudAdapter } from "./soundcloud-adapter.js";
import { MusicRepository } from "@music-link-finder/db";
import { SearchMode, SearchStatus } from "@prisma/client";

type PlatformHealth = AdapterStatus & {
  fallbackEnabled: boolean;
};

type CollectorResult<T extends SearchResult> = {
  results: T[];
  failures: PlatformFailure[];
};

export class MusicSearchService {
  private readonly apiAdapters: MusicPlatformAdapter[];
  private readonly webAdapters: WebPlayerAdapter[];
  private readonly repo: MusicRepository;

  constructor(private readonly config: RuntimeConfig = createRuntimeConfig()) {
    this.repo = new MusicRepository();
    this.apiAdapters = [
      new SpotifyAdapter(config.env),
      new AppleMusicAdapter(config.env),
      new YouTubeAdapter(config.env, "youtube"),
      new YouTubeAdapter(config.env, "youtubeMusic"),
      new TidalAdapter(config.env),
      new AmazonMusicAdapter(config.env),
      new SoundCloudAdapter(config.env)
    ];
    this.webAdapters = platformNames.map((platform) => new WebPlayerAdapter(platform));
  }

  getPlatformStatuses(): PlatformHealth[] {
    return platformConfigs.map((platform) => {
      const api = this.apiAdapters.find((adapter) => adapter.name === platform.name);
      return {
        platform: platform.name,
        displayName: platform.displayName,
        enabled: api?.enabled ?? this.config.webPlayerFallbackEnabled,
        source: api?.enabled ? "api" : "web-player",
        reason: api?.enabled ? undefined : api?.reason ?? "No API adapter implemented yet; web player fallback is used.",
        capabilities: api?.capabilities ?? ["searchTrack", "searchAlbum", "searchArtist"],
        fallbackEnabled: this.config.webPlayerFallbackEnabled
      };
    });
  }

  async searchTrack(input: { query: string; artist?: string; releaseType?: "track" | "album"; market?: string }): Promise<SearchResponse<Track>> {
    const startedAt = Date.now();
    const market = input.market ?? this.config.defaultMarket;
    const collected = await this.collect<Track>((adapter) => adapter.searchTrack?.({ ...input, market }));
    let results = mergeTracks(collected.results).map((track) => this.withWebLinks(track));

    if (results.length === 0 && this.config.webPlayerFallbackEnabled) {
      results = [this.createSearchOnlyTrack(input.query, input.artist)];
    }

    const ranked = sortByConfidence(results.map((track) => ({ ...track, confidence: scoreTrackCandidate(track, input.query, input.artist) }))).slice(0, 20);
    return this.envelope({ mode: SearchMode.TRACK, queryString: input.query, query: input, results: ranked, failures: collected.failures, startedAt });
  }

  async searchAlbum(input: { query: string; artist?: string; market?: string }): Promise<SearchResponse<Album>> {
    const startedAt = Date.now();
    const market = input.market ?? this.config.defaultMarket;
    const collected = await this.collect<Album>((adapter) => adapter.searchAlbum?.({ ...input, market }));
    let results = mergeAlbums(collected.results).map((album) => this.withWebLinks(album));

    if (results.length === 0 && this.config.webPlayerFallbackEnabled) {
      results = [this.createSearchOnlyAlbum(input.query, input.artist)];
    }

    const ranked = sortByConfidence(results.map((album) => ({ ...album, confidence: scoreAlbumCandidate(album, input.query, input.artist) }))).slice(0, 20);
    return this.envelope({ mode: SearchMode.ALBUM, queryString: input.query, query: input, results: ranked, failures: collected.failures, startedAt });
  }

  async searchArtist(input: { query: string; market?: string }): Promise<SearchResponse<Artist>> {
    const startedAt = Date.now();
    const market = input.market ?? this.config.defaultMarket;
    const collected = await this.collect<Artist>((adapter) => adapter.searchArtist?.({ ...input, market }));
    let results = mergeArtists(collected.results).map((artist) => this.withWebLinks(artist));

    if (results.length === 0 && this.config.webPlayerFallbackEnabled) {
      results = [this.createSearchOnlyArtist(input.query)];
    }

    const ranked = sortByConfidence(results.map((artist) => ({ ...artist, confidence: scoreArtistCandidate(artist, input.query) }))).slice(0, 20);
    return this.envelope({ mode: SearchMode.ARTIST, queryString: input.query, query: input, results: ranked, failures: collected.failures, startedAt });
  }

  async searchByIsrc(input: { isrc: string; market?: string }): Promise<SearchResponse<Track>> {
    const startedAt = Date.now();
    const isrc = normalizeCode(input.isrc);
    const market = input.market ?? this.config.defaultMarket;
    const collected = await this.collect<Track>((adapter) => adapter.searchByIsrc?.(isrc, market));
    const results = mergeTracks(collected.results).map((track) => this.withWebLinks({ ...track, isrc: track.isrc ?? isrc }));
    const failures = [...collected.failures];

    if (results.length === 0) {
      failures.push({
        platform: "system",
        code: "NO_ISRC_MATCH",
        message:
          "Nenhuma API encontrou este ISRC. Use a busca por nome da faixa e artista para gerar links de pesquisa nas plataformas."
      });
    }

    return this.envelope({ mode: SearchMode.ISRC, queryString: isrc, query: { ...input, isrc }, results: sortByConfidence(results).slice(0, 20), failures, startedAt });
  }

  async searchByUpc(input: { upc: string; market?: string }): Promise<SearchResponse<Album>> {
    const startedAt = Date.now();
    const upc = normalizeCode(input.upc);
    const market = input.market ?? this.config.defaultMarket;
    const collected = await this.collect<Album>((adapter) => adapter.searchByUpc?.(upc, market));
    const results = mergeAlbums(collected.results).map((album) => this.withWebLinks({ ...album, upc: album.upc ?? upc }));
    const failures = [...collected.failures];

    if (results.length === 0) {
      failures.push({
        platform: "system",
        code: "NO_UPC_MATCH",
        message:
          "Nenhuma API encontrou este UPC/EAN. Use a busca por nome do álbum e artista para gerar links de pesquisa nas plataformas."
      });
    }

    return this.envelope({ mode: SearchMode.UPC, queryString: upc, query: { ...input, upc }, results: sortByConfidence(results).slice(0, 20), failures, startedAt });
  }

  async searchByUrl(input: { url: string; market?: string }): Promise<SearchResponse> {
    const startedAt = Date.now();
    const detected = detectPlatformUrl(input.url);
    if (!detected) {
      return this.envelope({
        mode: SearchMode.URL, queryString: input.url,
        query: input,
        results: [],
        failures: [{ platform: "system", code: "UNSUPPORTED_URL", message: "Esta URL não é de uma plataforma suportada." }],
        startedAt
      });
    }

    const adapter = this.apiAdapters.find((candidate) => candidate.name === detected.platformName && candidate.enabled && candidate.resolveUrl);
    if (!adapter?.resolveUrl) {
      return this.envelope({
        mode: SearchMode.URL, queryString: input.url,
        query: { ...input, detected },
        results: [],
        failures: [
          {
            platform: detected.platformName,
            code: "URL_RESOLVE_UNAVAILABLE",
            message:
              "A URL foi reconhecida, mas não há API configurada para ler os metadados. Busque por título e artista para usar o fallback nas plataformas."
          }
        ],
        startedAt
      });
    }

    let resolved: ResolvedEntity | undefined;
    const failures: PlatformFailure[] = [];
    try {
      resolved = await adapter.resolveUrl(input.url, input.market ?? this.config.defaultMarket);
    } catch (error) {
      failures.push(toFailure(detected.platformName, error));
    }

    if (!resolved) {
      failures.push({
        platform: detected.platformName,
        code: "URL_RESOLVE_EMPTY",
        message: "A plataforma de origem não devolveu metadados para esta URL."
      });
      return this.envelope({ mode: SearchMode.URL, queryString: input.url, query: { ...input, detected }, results: [], failures, startedAt });
    }

    if (resolved.entityType === "track") {
      const track = resolved.entity as Track;
      const crossSearch = track.isrc
        ? await this.searchByIsrc({ isrc: track.isrc, market: input.market })
        : await this.searchTrack({ query: track.title, artist: track.mainArtist, market: input.market });
      const results = mergeTracks([track, ...(crossSearch.results as Track[])]).map((item) => this.withWebLinks(item));
      return this.envelope({ mode: SearchMode.URL, queryString: input.url, query: { ...input, detected }, results, failures: [...failures, ...crossSearch.failures], startedAt });
    }

    if (resolved.entityType === "album") {
      const album = resolved.entity as Album;
      const crossSearch = album.upc
        ? await this.searchByUpc({ upc: album.upc, market: input.market })
        : await this.searchAlbum({ query: album.title, artist: album.mainArtist, market: input.market });
      const results = mergeAlbums([album, ...(crossSearch.results as Album[])]).map((item) => this.withWebLinks(item));
      return this.envelope({ mode: SearchMode.URL, queryString: input.url, query: { ...input, detected }, results, failures: [...failures, ...crossSearch.failures], startedAt });
    }

    const artist = resolved.entity as Artist;
    const crossSearch = await this.searchArtist({ query: artist.name, market: input.market });
    const results = mergeArtists([artist, ...(crossSearch.results as Artist[])]).map((item) => this.withWebLinks(item));
    return this.envelope({ mode: SearchMode.URL, queryString: input.url, query: { ...input, detected }, results, failures: [...failures, ...crossSearch.failures], startedAt });
  }

  private async collect<T extends SearchResult>(
    run: (adapter: MusicPlatformAdapter) => Promise<T[]> | undefined
  ): Promise<CollectorResult<T>> {
    const enabledAdapters = this.apiAdapters.filter((adapter) => adapter.enabled);
    const tasks = enabledAdapters.flatMap((adapter) => {
      const promise = run(adapter);
      return promise ? [{ adapter, promise }] : [];
    });

    const settled = await Promise.allSettled(tasks.map((task) => task.promise));
    const results: T[] = [];
    const failures: PlatformFailure[] = [];

    for (const [index, outcome] of settled.entries()) {
      const task = tasks[index];
      if (!task) continue;
      if (outcome.status === "fulfilled") {
        results.push(...outcome.value);
      } else {
        failures.push(toFailure(task.adapter.name, outcome.reason));
      }
    }

    return { results, failures };
  }

  private withWebLinks<T extends Track | Album | Artist>(entity: T): T {
    if (!this.config.webPlayerFallbackEnabled) return entity;

    const query = entity.type === "artist" ? entity.name : buildMusicQuery(entity.title, entity.mainArtist);
    const existingPlatforms = new Set(entity.links.map((link) => link.platformName));
    const links = [...entity.links];

    for (const adapter of this.webAdapters) {
      if (!existingPlatforms.has(adapter.name)) {
        links.push(createWebPlayerLink(adapter.name, entity.type, query));
      }
    }

    return {
      ...entity,
      links: dedupeLinks(links)
    };
  }

  private createSearchOnlyTrack(query: string, artist?: string): Track {
    const musicQuery = buildMusicQuery(query, artist);
    return {
      type: "track",
      title: query,
      mainArtist: artist ?? "Unknown artist",
      featuredArtists: [],
      links: platformNames.map((platform) => createWebPlayerLink(platform, "track", musicQuery)),
      confidence: 0.35
    };
  }

  private createSearchOnlyAlbum(query: string, artist?: string): Album {
    const musicQuery = buildMusicQuery(query, artist);
    return {
      type: "album",
      title: query,
      mainArtist: artist ?? "Unknown artist",
      releaseType: "unknown",
      links: platformNames.map((platform) => createWebPlayerLink(platform, "album", musicQuery)),
      confidence: 0.35
    };
  }

  private createSearchOnlyArtist(query: string): Artist {
    return {
      type: "artist",
      name: query,
      links: platformNames.map((platform) => createWebPlayerLink(platform, "artist", query)),
      confidence: 0.35
    };
  }

  private envelope<T extends SearchResult>(input: {
    mode: SearchMode;
    queryString: string;
    query: Record<string, unknown>;
    results: T[];
    failures: PlatformFailure[];
    startedAt: number;
  }): SearchResponse<T> {
    const durationMs = Date.now() - input.startedAt;
    const failures = dedupeFailures(input.failures);
    const status = input.results.length > 0 && failures.length === 0 ? SearchStatus.SUCCESS : input.results.length > 0 ? SearchStatus.PARTIAL : SearchStatus.FAILED;

    // Fire-and-forget analytics only (do not persist incomplete catalog rows per search).
    this.repo.logSearch(input.mode, input.queryString, status, durationMs, failures).catch(console.error);

    return {
      query: input.query,
      results: input.results,
      failures,
      meta: {
        durationMs,
        cached: false,
        fallbackUsed: input.results.some((result) => result.links.some((link) => link.source === "web-player"))
      }
    };
  }
}

function mergeTracks(tracks: Track[]): Track[] {
  const map = new Map<string, Track>();
  for (const track of tracks) {
    const key = track.isrc ? `isrc:${normalizeCode(track.isrc)}` : `track:${normalizeText(track.title)}:${normalizeText(track.mainArtist)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...track, links: dedupeLinks(track.links) });
      continue;
    }

    map.set(key, {
      ...existing,
      ...emptySafe(existing, track),
      featuredArtists: Array.from(new Set([...existing.featuredArtists, ...track.featuredArtists])),
      links: dedupeLinks([...existing.links, ...track.links]),
      confidence: Math.max(existing.confidence, track.confidence)
    });
  }
  return Array.from(map.values());
}

function mergeAlbums(albums: Album[]): Album[] {
  const map = new Map<string, Album>();
  for (const album of albums) {
    const key = album.upc ? `upc:${normalizeCode(album.upc)}` : `album:${normalizeText(album.title)}:${normalizeText(album.mainArtist)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...album, links: dedupeLinks(album.links) });
      continue;
    }

    map.set(key, {
      ...existing,
      ...emptySafe(existing, album),
      tracklist: existing.tracklist ?? album.tracklist,
      links: dedupeLinks([...existing.links, ...album.links]),
      confidence: Math.max(existing.confidence, album.confidence)
    });
  }
  return Array.from(map.values());
}

function mergeArtists(artists: Artist[]): Artist[] {
  const map = new Map<string, Artist>();
  for (const artist of artists) {
    const key = `artist:${normalizeText(artist.name)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...artist, links: dedupeLinks(artist.links) });
      continue;
    }

    map.set(key, {
      ...existing,
      ...emptySafe(existing, artist),
      links: dedupeLinks([...existing.links, ...artist.links]),
      confidence: Math.max(existing.confidence, artist.confidence),
      followers: Math.max(existing.followers ?? 0, artist.followers ?? 0) || undefined,
      monthlyListeners: Math.max(existing.monthlyListeners ?? 0, artist.monthlyListeners ?? 0) || undefined
    });
  }
  return Array.from(map.values());
}

function emptySafe<T extends Record<string, unknown>>(existing: T, incoming: T): Partial<T> {
  const next: Partial<T> = {};
  for (const [key, value] of Object.entries(incoming) as Array<[keyof T, T[keyof T]]>) {
    if (value !== undefined && value !== "" && (existing[key] === undefined || existing[key] === "")) {
      next[key] = value;
    }
  }
  return next;
}

function dedupeLinks(links: PlatformLink[]): PlatformLink[] {
  const seen = new Set<string>();
  const deduped: PlatformLink[] = [];
  for (const link of links) {
    const key = `${link.platformName}:${link.entityType}:${link.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(link);
    }
  }
  return deduped.sort((left, right) => left.platformName.localeCompare(right.platformName));
}

function dedupeFailures(failures: PlatformFailure[]): PlatformFailure[] {
  const seen = new Set<string>();
  return failures.filter((failure) => {
    const key = `${failure.platform}:${failure.code}:${failure.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toFailure(platform: PlatformName, error: unknown): PlatformFailure {
  return {
    platform,
    code: "PLATFORM_ERROR",
    message: error instanceof Error ? error.message : "Erro desconhecido da plataforma"
  };
}

export function createMusicSearchService(env: NodeJS.ProcessEnv = process.env): MusicSearchService {
  return new MusicSearchService(createRuntimeConfig(env));
}
