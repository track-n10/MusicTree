"use client";

import { platformConfigs, type PlatformFailure, type PlatformLink, type SearchResponse, type SearchResult } from "@music-link-finder/core";
import { AlertTriangle, ExternalLink, Loader2, Moon, Music2, Search, Sun } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type Mode = "name" | "isrc" | "upc" | "url" | "artist";
type ReleaseKind = "track" | "album";

const modes: Array<{ value: Mode; label: string; placeholder: string }> = [
  { value: "name", label: "Track/Album name", placeholder: "Perfect Ed Sheeran" },
  { value: "isrc", label: "ISRC", placeholder: "GBAHS1700024" },
  { value: "upc", label: "UPC", placeholder: "00602537618132" },
  { value: "url", label: "URL", placeholder: "https://open.spotify.com/track/..." },
  { value: "artist", label: "Artist", placeholder: "Ed Sheeran" }
];

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const platformLabels = new Map(platformConfigs.map((platform) => [platform.name, platform.displayName]));

export function SearchApp() {
  const [mode, setMode] = useState<Mode>("name");
  const [releaseKind, setReleaseKind] = useState<ReleaseKind>("track");
  const [query, setQuery] = useState("");
  const [artist, setArtist] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [response, setResponse] = useState<SearchResponse>();

  const activeMode = useMemo(() => modes.find((item) => item.value === mode) ?? modes[0], [mode]);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(undefined);
    setResponse(undefined);

    try {
      const endpoint = endpointFor(mode, releaseKind);
      const body = bodyFor(mode, query, artist);
      const result = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const payload = await result.json();
      if (!result.ok) {
        throw new Error(payload.error?.message ?? "Search failed");
      }

      setResponse(payload as SearchResponse);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="shell">
      <section className="topbar" aria-label="Application header">
        <div className="brand">
          <span className="brand-mark">
            <Music2 size={19} />
          </span>
          <span>Music Link Finder</span>
        </div>
        <button className="icon-button" type="button" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </section>

      <section className="search-surface">
        <div className="intro">
          <p className="eyebrow">Cross-platform music lookup</p>
          <h1>Find the release, then open it anywhere.</h1>
        </div>

        <form className="search-form" onSubmit={onSubmit}>
          <div className="mode-grid" role="tablist" aria-label="Search mode">
            {modes.map((item) => (
              <button
                key={item.value}
                className={item.value === mode ? "mode active" : "mode"}
                type="button"
                onClick={() => setMode(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="query-row">
            <label className="query-input">
              <span>{activeMode?.label}</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={activeMode?.placeholder} />
            </label>

            {mode === "name" ? (
              <>
                <label className="small-input">
                  <span>Artist</span>
                  <input value={artist} onChange={(event) => setArtist(event.target.value)} placeholder="Optional" />
                </label>
                <label className="small-input">
                  <span>Type</span>
                  <select value={releaseKind} onChange={(event) => setReleaseKind(event.target.value as ReleaseKind)}>
                    <option value="track">Track</option>
                    <option value="album">Album</option>
                  </select>
                </label>
              </>
            ) : null}

            <button className="search-button" type="submit" disabled={loading || !query.trim()}>
              {loading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
              <span>Search</span>
            </button>
          </div>
        </form>
      </section>

      {error ? <Notice kind="error" message={error} /> : null}
      {response?.failures.length ? <FailureStrip failures={response.failures} /> : null}

      <section className="results" aria-live="polite">
        {loading ? <LoadingGrid /> : null}
        {!loading && response && response.results.length === 0 ? <EmptyState /> : null}
        {!loading && response?.results.map((result, index) => <ResultCard key={`${result.type}-${index}-${result.id ?? resultTitle(result)}`} result={result} />)}
      </section>
    </main>
  );
}

function endpointFor(mode: Mode, releaseKind: ReleaseKind): string {
  if (mode === "name") return releaseKind === "album" ? "/search/album" : "/search/track";
  if (mode === "isrc") return "/search/isrc";
  if (mode === "upc") return "/search/upc";
  if (mode === "url") return "/search/url";
  return "/search/artist";
}

function bodyFor(mode: Mode, query: string, artist: string): Record<string, string> {
  if (mode === "isrc") return { isrc: query.trim() };
  if (mode === "upc") return { upc: query.trim() };
  if (mode === "url") return { url: query.trim() };
  if (mode === "artist") return { query: query.trim() };
  return {
    query: query.trim(),
    ...(artist.trim() ? { artist: artist.trim() } : {})
  };
}

function ResultCard({ result }: { result: SearchResult }) {
  const imageUrl = result.type === "artist" ? result.avatarUrl : result.coverImageUrl;
  const subtitle = result.type === "artist" ? "Artist profile" : result.mainArtist;
  const stats = metadataLine(result);

  return (
    <article className="result-card">
      <div className="artwork">
        {imageUrl ? <img src={imageUrl} alt="" /> : <Music2 size={30} />}
      </div>
      <div className="result-body">
        <div className="result-heading">
          <div>
            <p className="result-type">{result.type}</p>
            <h2>{resultTitle(result)}</h2>
            <p className="subtitle">{subtitle}</p>
          </div>
          <Confidence value={result.confidence} />
        </div>
        {stats ? <p className="metadata">{stats}</p> : null}
        <PlatformLinks links={result.links} />
      </div>
    </article>
  );
}

function PlatformLinks({ links }: { links: PlatformLink[] }) {
  return (
    <div className="platforms" aria-label="Platform links">
      {links.map((link) => {
        const label = platformLabels.get(link.platformName) ?? link.platformName;
        return (
          <a key={`${link.platformName}-${link.url}`} href={link.url} target="_blank" rel="noreferrer" className={link.source === "api" ? "platform exact" : "platform"}>
            <span className="platform-initials">{initials(label)}</span>
            <span>{label}</span>
            <ExternalLink size={13} />
          </a>
        );
      })}
    </div>
  );
}

function FailureStrip({ failures }: { failures: PlatformFailure[] }) {
  return (
    <section className="failure-strip">
      <AlertTriangle size={18} />
      <div>
        {failures.slice(0, 4).map((failure) => (
          <p key={`${failure.platform}-${failure.code}-${failure.message}`}>
            <strong>{platformLabels.get(failure.platform as never) ?? failure.platform}</strong>: {failure.message}
          </p>
        ))}
      </div>
    </section>
  );
}

function Notice({ message }: { kind: "error"; message: string }) {
  return <section className="notice">{message}</section>;
}

function LoadingGrid() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <article className="result-card loading-card" key={item}>
          <div className="artwork skeleton" />
          <div className="result-body">
            <span className="skeleton line wide" />
            <span className="skeleton line" />
            <span className="skeleton line short" />
          </div>
        </article>
      ))}
    </>
  );
}

function EmptyState() {
  return (
    <section className="empty">
      <Music2 size={24} />
      <p>No results found.</p>
    </section>
  );
}

function Confidence({ value }: { value: number }) {
  return <span className="confidence">{Math.round(value * 100)}%</span>;
}

function resultTitle(result: SearchResult): string {
  return result.type === "artist" ? result.name : result.title;
}

function metadataLine(result: SearchResult): string {
  if (result.type === "track") {
    return [
      result.albumTitle ? `Album: ${result.albumTitle}` : undefined,
      result.isrc ? `ISRC ${result.isrc}` : undefined,
      result.releaseDate,
      result.durationMs ? formatDuration(result.durationMs) : undefined,
      result.explicit ? "Explicit" : undefined
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (result.type === "album") {
    return [
      result.releaseType,
      result.upc ? `UPC ${result.upc}` : undefined,
      result.releaseDate,
      result.tracklist?.length ? `${result.tracklist.length} tracks` : undefined,
      result.explicit ? "Explicit" : undefined
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return [result.followers ? `${Intl.NumberFormat().format(result.followers)} followers` : undefined, result.monthlyListeners ? `${Intl.NumberFormat().format(result.monthlyListeners)} monthly listeners` : undefined]
    .filter(Boolean)
    .join(" · ");
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function initials(label: string): string {
  return label
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
