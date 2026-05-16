export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(feat|ft|featuring)\b\.?/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeCode(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function dedupeStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function buildMusicQuery(title: string, artist?: string): string {
  return [title, artist].filter(Boolean).join(" ").trim();
}

export function parseReleaseType(albumType?: string, totalTracks?: number): "single" | "ep" | "album" | "compilation" | "unknown" {
  const normalized = normalizeText(albumType ?? "");
  if (normalized.includes("compilation")) return "compilation";
  if (normalized.includes("single")) return totalTracks && totalTracks > 3 ? "ep" : "single";
  if (normalized.includes("album")) return "album";
  if (typeof totalTracks === "number") {
    if (totalTracks <= 3) return "single";
    if (totalTracks <= 6) return "ep";
    return "album";
  }
  return "unknown";
}
