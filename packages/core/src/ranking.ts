import type { Album, Artist, SearchResult, Track } from "./types.js";
import { normalizeText } from "./normalization.js";

function tokenSet(value: string): Set<string> {
  return new Set(normalizeText(value).split(" ").filter(Boolean));
}

export function tokenSimilarity(left: string, right: string): number {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (a.size === 0 || b.size === 0) return 0;

  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }

  return overlap / Math.max(a.size, b.size);
}

export function scoreTrackCandidate(candidate: Track, query: string, artist?: string): number {
  const titleScore = tokenSimilarity(candidate.title, query);
  const artistScore = artist ? tokenSimilarity(candidate.mainArtist, artist) : 0.15;
  const identifierBoost = candidate.isrc ? 0.2 : 0;
  const exactBoost = normalizeText(candidate.title) === normalizeText(query) ? 0.2 : 0;
  return Math.min(1, candidate.confidence * 0.35 + titleScore * 0.35 + artistScore * 0.2 + identifierBoost + exactBoost);
}

export function scoreAlbumCandidate(candidate: Album, query: string, artist?: string): number {
  const titleScore = tokenSimilarity(candidate.title, query);
  const artistScore = artist ? tokenSimilarity(candidate.mainArtist, artist) : 0.15;
  const identifierBoost = candidate.upc ? 0.2 : 0;
  const exactBoost = normalizeText(candidate.title) === normalizeText(query) ? 0.2 : 0;
  return Math.min(1, candidate.confidence * 0.35 + titleScore * 0.35 + artistScore * 0.2 + identifierBoost + exactBoost);
}

export function scoreArtistCandidate(candidate: Artist, query: string): number {
  const nameScore = tokenSimilarity(candidate.name, query);
  const exactBoost = normalizeText(candidate.name) === normalizeText(query) ? 0.25 : 0;
  return Math.min(1, candidate.confidence * 0.35 + nameScore * 0.45 + exactBoost);
}

export function sortByConfidence<T extends SearchResult>(results: T[]): T[] {
  return [...results].sort((left, right) => right.confidence - left.confidence);
}
