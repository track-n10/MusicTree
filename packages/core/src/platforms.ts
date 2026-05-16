export const platformNames = [
  "spotify",
  "appleMusic",
  "deezer",
  "amazonMusic",
  "tidal",
  "audiomack",
  "yandexMusic",
  "youtube",
  "youtubeMusic",
  "flo",
  "netease",
  "joox",
  "qobuz",
  "soundcloud",
  "pandora",
  "beatport",
  "boomplay",
  "anghami",
  "bandcamp"
] as const;

export type PlatformName = (typeof platformNames)[number];

export type EntityType = "track" | "album" | "artist";

export type PlatformCapability =
  | "searchTrack"
  | "searchAlbum"
  | "searchArtist"
  | "searchByIsrc"
  | "searchByUpc"
  | "resolveUrl";

export type PlatformConfig = {
  name: PlatformName;
  displayName: string;
  homepageUrl: string;
  credentialKeys: string[];
  capabilities: PlatformCapability[];
  webPlayerSearch: Record<EntityType, string>;
};

export const platformConfigs: PlatformConfig[] = [
  {
    name: "spotify",
    displayName: "Spotify",
    homepageUrl: "https://open.spotify.com",
    credentialKeys: ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "searchByIsrc", "searchByUpc", "resolveUrl"],
    webPlayerSearch: {
      track: "https://open.spotify.com/search/{query}/tracks",
      album: "https://open.spotify.com/search/{query}/albums",
      artist: "https://open.spotify.com/search/{query}/artists"
    }
  },
  {
    name: "appleMusic",
    displayName: "Apple Music",
    homepageUrl: "https://music.apple.com",
    credentialKeys: ["APPLE_MUSIC_DEVELOPER_TOKEN"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "searchByIsrc", "searchByUpc", "resolveUrl"],
    webPlayerSearch: {
      track: "https://music.apple.com/search?term={query}",
      album: "https://music.apple.com/search?term={query}",
      artist: "https://music.apple.com/search?term={query}"
    }
  },
  {
    name: "deezer",
    displayName: "Deezer",
    homepageUrl: "https://www.deezer.com",
    credentialKeys: [],
    capabilities: ["searchByIsrc"],
    webPlayerSearch: {
      track: "https://www.deezer.com/search?q={query}",
      album: "https://www.deezer.com/search?q={query}",
      artist: "https://www.deezer.com/search?q={query}"
    }
  },
  {
    name: "amazonMusic",
    displayName: "Amazon Music",
    homepageUrl: "https://music.amazon.com",
    credentialKeys: ["AMAZON_MUSIC_API_KEY"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://music.amazon.com/search/{query}",
      album: "https://music.amazon.com/search/{query}",
      artist: "https://music.amazon.com/search/{query}"
    }
  },
  {
    name: "tidal",
    displayName: "TIDAL",
    homepageUrl: "https://listen.tidal.com",
    credentialKeys: ["TIDAL_CLIENT_ID", "TIDAL_CLIENT_SECRET"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://listen.tidal.com/search?q={query}",
      album: "https://listen.tidal.com/search?q={query}",
      artist: "https://listen.tidal.com/search?q={query}"
    }
  },
  {
    name: "audiomack",
    displayName: "Audiomack",
    homepageUrl: "https://audiomack.com",
    credentialKeys: ["AUDIOMACK_API_KEY"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://audiomack.com/search?q={query}",
      album: "https://audiomack.com/search?q={query}",
      artist: "https://audiomack.com/search?q={query}"
    }
  },
  {
    name: "yandexMusic",
    displayName: "Yandex Music",
    homepageUrl: "https://music.yandex.com",
    credentialKeys: ["YANDEX_MUSIC_TOKEN"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://music.yandex.com/search?text={query}",
      album: "https://music.yandex.com/search?text={query}",
      artist: "https://music.yandex.com/search?text={query}"
    }
  },
  {
    name: "youtube",
    displayName: "YouTube",
    homepageUrl: "https://www.youtube.com",
    credentialKeys: ["YOUTUBE_API_KEY"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://www.youtube.com/results?search_query={query}",
      album: "https://www.youtube.com/results?search_query={query}",
      artist: "https://www.youtube.com/results?search_query={query}"
    }
  },
  {
    name: "youtubeMusic",
    displayName: "YouTube Music",
    homepageUrl: "https://music.youtube.com",
    credentialKeys: ["YOUTUBE_API_KEY"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://music.youtube.com/search?q={query}",
      album: "https://music.youtube.com/search?q={query}",
      artist: "https://music.youtube.com/search?q={query}"
    }
  },
  {
    name: "flo",
    displayName: "FLO",
    homepageUrl: "https://www.music-flo.com",
    credentialKeys: ["FLO_API_KEY"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://www.music-flo.com/search/all?keyword={query}",
      album: "https://www.music-flo.com/search/all?keyword={query}",
      artist: "https://www.music-flo.com/search/all?keyword={query}"
    }
  },
  {
    name: "netease",
    displayName: "NetEase Cloud Music",
    homepageUrl: "https://music.163.com",
    credentialKeys: ["NETEASE_API_KEY"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://music.163.com/#/search/m/?s={query}&type=1",
      album: "https://music.163.com/#/search/m/?s={query}&type=10",
      artist: "https://music.163.com/#/search/m/?s={query}&type=100"
    }
  },
  {
    name: "joox",
    displayName: "Joox",
    homepageUrl: "https://www.joox.com",
    credentialKeys: ["JOOX_API_KEY"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://www.joox.com/intl/search/{query}",
      album: "https://www.joox.com/intl/search/{query}",
      artist: "https://www.joox.com/intl/search/{query}"
    }
  },
  {
    name: "qobuz",
    displayName: "Qobuz",
    homepageUrl: "https://play.qobuz.com",
    credentialKeys: ["QOBUZ_APP_ID", "QOBUZ_APP_SECRET"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://play.qobuz.com/search?q={query}",
      album: "https://play.qobuz.com/search?q={query}",
      artist: "https://play.qobuz.com/search?q={query}"
    }
  },
  {
    name: "soundcloud",
    displayName: "SoundCloud",
    homepageUrl: "https://soundcloud.com",
    credentialKeys: ["SOUNDCLOUD_CLIENT_ID"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://soundcloud.com/search/sounds?q={query}",
      album: "https://soundcloud.com/search/albums?q={query}",
      artist: "https://soundcloud.com/search/people?q={query}"
    }
  },
  {
    name: "pandora",
    displayName: "Pandora",
    homepageUrl: "https://www.pandora.com",
    credentialKeys: ["PANDORA_API_KEY"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://www.pandora.com/search/{query}/all",
      album: "https://www.pandora.com/search/{query}/all",
      artist: "https://www.pandora.com/search/{query}/all"
    }
  },
  {
    name: "beatport",
    displayName: "Beatport",
    homepageUrl: "https://www.beatport.com",
    credentialKeys: ["BEATPORT_CLIENT_ID", "BEATPORT_CLIENT_SECRET"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://www.beatport.com/search?q={query}",
      album: "https://www.beatport.com/search?q={query}",
      artist: "https://www.beatport.com/search?q={query}"
    }
  },
  {
    name: "boomplay",
    displayName: "Boomplay",
    homepageUrl: "https://www.boomplay.com",
    credentialKeys: ["BOOMPLAY_API_KEY"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://www.boomplay.com/search/{query}",
      album: "https://www.boomplay.com/search/{query}",
      artist: "https://www.boomplay.com/search/{query}"
    }
  },
  {
    name: "anghami",
    displayName: "Anghami",
    homepageUrl: "https://play.anghami.com",
    credentialKeys: ["ANGHAMI_CLIENT_ID", "ANGHAMI_CLIENT_SECRET"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://play.anghami.com/search/{query}",
      album: "https://play.anghami.com/search/{query}",
      artist: "https://play.anghami.com/search/{query}"
    }
  },
  {
    name: "bandcamp",
    displayName: "Bandcamp",
    homepageUrl: "https://bandcamp.com",
    credentialKeys: ["BANDCAMP_API_KEY"],
    capabilities: ["searchTrack", "searchAlbum", "searchArtist", "resolveUrl"],
    webPlayerSearch: {
      track: "https://bandcamp.com/search?q={query}",
      album: "https://bandcamp.com/search?q={query}",
      artist: "https://bandcamp.com/search?q={query}"
    }
  }
];

export function getPlatformConfig(platform: PlatformName): PlatformConfig {
  const config = platformConfigs.find((item) => item.name === platform);
  if (!config) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  return config;
}

export function buildWebPlayerSearchUrl(platform: PlatformName, entityType: EntityType, query: string): string {
  const config = getPlatformConfig(platform);
  const template = config.webPlayerSearch[entityType];
  return template.replace("{query}", encodeURIComponent(query.trim()));
}
