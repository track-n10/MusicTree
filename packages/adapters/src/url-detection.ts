import type { EntityType, PlatformName, UrlResolveResult } from "@music-link-finder/core";

type UrlRule = {
  platform: PlatformName;
  hosts: string[];
  entityFromPath(pathname: string): EntityType | undefined;
  idFromPath?(pathname: string, url: URL): string | undefined;
};

function segment(pathname: string, index: number): string | undefined {
  return pathname.split("/").filter(Boolean)[index];
}

function entityFromKnownSegment(pathname: string): EntityType | undefined {
  const first = segment(pathname, 0);
  if (first === "track" || first === "song") return "track";
  if (first === "album" || first === "release") return "album";
  if (first === "artist" || first === "channel" || first === "user") return "artist";
  return undefined;
}

const rules: UrlRule[] = [
  {
    platform: "spotify",
    hosts: ["open.spotify.com"],
    entityFromPath: entityFromKnownSegment,
    idFromPath: (pathname) => segment(pathname, 1)
  },
  {
    platform: "appleMusic",
    hosts: ["music.apple.com", "itunes.apple.com"],
    entityFromPath: (pathname) => {
      if (pathname.includes("/album/")) return "album";
      if (pathname.includes("/artist/")) return "artist";
      return pathname.includes("/song/") ? "track" : undefined;
    },
    idFromPath: (_pathname, url) => url.searchParams.get("i") ?? segment(url.pathname, url.pathname.split("/").filter(Boolean).length - 1)
  },
  {
    platform: "amazonMusic",
    hosts: ["music.amazon.com"],
    entityFromPath: entityFromKnownSegment
  },
  {
    platform: "tidal",
    hosts: ["listen.tidal.com", "tidal.com"],
    entityFromPath: entityFromKnownSegment,
    idFromPath: (pathname) => segment(pathname, 1)
  },
  {
    platform: "audiomack",
    hosts: ["audiomack.com"],
    entityFromPath: (pathname) => {
      if (pathname.includes("/song/")) return "track";
      if (pathname.includes("/album/")) return "album";
      return "artist";
    }
  },
  {
    platform: "yandexMusic",
    hosts: ["music.yandex.com", "music.yandex.ru"],
    entityFromPath: entityFromKnownSegment
  },
  {
    platform: "youtube",
    hosts: ["www.youtube.com", "youtube.com", "youtu.be"],
    entityFromPath: (pathname) => (pathname.includes("/channel/") || pathname.includes("/@") ? "artist" : "track"),
    idFromPath: (pathname, url) => url.hostname === "youtu.be" ? segment(pathname, 0) : url.searchParams.get("v") ?? segment(pathname, 1)
  },
  {
    platform: "youtubeMusic",
    hosts: ["music.youtube.com"],
    entityFromPath: (pathname) => (pathname.includes("/channel/") ? "artist" : "track"),
    idFromPath: (_pathname, url) => url.searchParams.get("v") ?? segment(url.pathname, 1)
  },
  {
    platform: "flo",
    hosts: ["www.music-flo.com", "music-flo.com"],
    entityFromPath: entityFromKnownSegment
  },
  {
    platform: "netease",
    hosts: ["music.163.com"],
    entityFromPath: (pathname) => {
      if (pathname.includes("song")) return "track";
      if (pathname.includes("album")) return "album";
      if (pathname.includes("artist")) return "artist";
      return undefined;
    }
  },
  {
    platform: "joox",
    hosts: ["www.joox.com", "joox.com"],
    entityFromPath: entityFromKnownSegment
  },
  {
    platform: "qobuz",
    hosts: ["play.qobuz.com", "www.qobuz.com", "qobuz.com"],
    entityFromPath: entityFromKnownSegment,
    idFromPath: (pathname) => segment(pathname, 1)
  },
  {
    platform: "soundcloud",
    hosts: ["soundcloud.com", "on.soundcloud.com"],
    entityFromPath: (pathname) => (pathname.split("/").filter(Boolean).length > 1 ? "track" : "artist")
  },
  {
    platform: "pandora",
    hosts: ["www.pandora.com", "pandora.com"],
    entityFromPath: entityFromKnownSegment
  },
  {
    platform: "beatport",
    hosts: ["www.beatport.com", "beatport.com"],
    entityFromPath: entityFromKnownSegment
  },
  {
    platform: "boomplay",
    hosts: ["www.boomplay.com", "boomplay.com"],
    entityFromPath: entityFromKnownSegment
  },
  {
    platform: "anghami",
    hosts: ["play.anghami.com", "anghami.com"],
    entityFromPath: entityFromKnownSegment
  },
  {
    platform: "bandcamp",
    hosts: ["bandcamp.com"],
    entityFromPath: (pathname) => (pathname.includes("/track/") ? "track" : pathname.includes("/album/") ? "album" : "artist")
  }
];

export function detectPlatformUrl(value: string): UrlResolveResult | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  const host = url.hostname.toLowerCase().replace(/^m\./, "www.");
  const rule = rules.find((candidate) => candidate.hosts.some((candidateHost) => host === candidateHost || host.endsWith(`.${candidateHost}`)));
  if (!rule) return undefined;

  const entityType = rule.entityFromPath(url.pathname);
  if (!entityType) return undefined;

  return {
    platformName: rule.platform,
    entityType,
    platformEntityId: rule.idFromPath?.(url.pathname, url),
    url: value
  };
}
