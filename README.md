# Music Link Finder

https://music-tree-web.vercel.app/

A production-oriented web app for finding tracks, albums, artist profiles, and cross-platform music links from ISRC, UPC/EAN, text search, or supported platform URLs.

## Stack

- **Frontend:** Next.js, React, TypeScript, CSS
- **Backend:** Fastify, TypeScript, Zod validation
- **Integrations:** Adapter-based platform services
- **Database:** PostgreSQL with Prisma migrations
- **Rate limiting:** Fastify in-memory rate limit for the first version
- **Local services:** Docker Compose for PostgreSQL and Redis

The project is a TypeScript monorepo:

```text
apps/
  api/      Fastify REST API
  web/      Next.js web app
packages/
  adapters/ Platform API and web-player fallback adapters
  core/     Shared schemas, platform config, types, ranking
  db/       Prisma schema and migrations
```

## Platform Strategy

Each platform can use two paths:

1. **Official/API adapter** when credentials are available.
2. **Web-player fallback** when credentials are missing or the platform has no public API adapter yet.

The fallback creates a search link inside the platform's actual player/search surface using `track or album name + artist`. For example, Qobuz uses:

```text
https://play.qobuz.com/search?q={query}
```

This is intentionally different from searching only on `qobuz.com`, because the playable catalog lives under `play.qobuz.com`.

Supported platform configs are in:

```text
packages/core/src/platforms.ts
```

## Implemented API Adapters

- Spotify, with `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
- Apple Music, with `APPLE_MUSIC_DEVELOPER_TOKEN`
- Apple/iTunes public fallback when the Apple developer token is missing
- YouTube and YouTube Music, with `YOUTUBE_API_KEY`

All requested platforms are represented in the platform registry and web-player fallback layer:

- Spotify
- Apple Music
- Amazon Music
- Tidal
- Audiomack
- Yandex Music
- YouTube
- YouTube Music
- FLO
- NetEase Cloud Music
- Joox
- Qobuz
- SoundCloud
- Pandora
- Beatport
- Boomplay
- Anghami
- Bandcamp

## Setup

Install dependencies:

```bash
npm install
```

Copy the environment template:

```bash
cp .env.example .env
```

Start local infrastructure:

```bash
docker compose up -d
```

Generate Prisma client and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

Run the API and web app:

```bash
npm run dev
```

Default URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`

## Production Build

```bash
npm run build
```

Run API:

```bash
npm run start -w @music-link-finder/api
```

Run web:

```bash
npm run start -w @music-link-finder/web
```

For production, set:

```text
NODE_ENV=production
DATABASE_URL=...
REDIS_URL=...
NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com
```

## Environment Variables

Required for local app boot:

```text
API_PORT
API_HOST
NEXT_PUBLIC_API_BASE_URL
DATABASE_URL
RATE_LIMIT_MAX
RATE_LIMIT_TIME_WINDOW
WEB_PLAYER_FALLBACK_ENABLED
DEFAULT_MARKET
```

Optional platform credentials:

```text
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
APPLE_MUSIC_DEVELOPER_TOKEN
APPLE_MUSIC_STOREFRONT
YOUTUBE_API_KEY
AMAZON_MUSIC_API_KEY
TIDAL_CLIENT_ID
TIDAL_CLIENT_SECRET
AUDIOMACK_API_KEY
YANDEX_MUSIC_TOKEN
FLO_API_KEY
NETEASE_API_KEY
JOOX_API_KEY
QOBUZ_APP_ID
QOBUZ_APP_SECRET
SOUNDCLOUD_CLIENT_ID
PANDORA_API_KEY
BEATPORT_CLIENT_ID
BEATPORT_CLIENT_SECRET
BOOMPLAY_API_KEY
ANGHAMI_CLIENT_ID
ANGHAMI_CLIENT_SECRET
BANDCAMP_API_KEY
```

Missing platform credentials do not break the app. The API returns exact API matches where possible and web-player fallback links for the rest.

## API Endpoints

```http
GET  /health
GET  /platforms
POST /search/track
POST /search/album
POST /search/isrc
POST /search/upc
POST /search/url
POST /search/artist
```

Example:

```bash
curl -X POST http://localhost:4000/search/track \
  -H "Content-Type: application/json" \
  -d '{"query":"Perfect","artist":"Ed Sheeran"}'
```

All search endpoints return:

```json
{
  "query": {},
  "results": [],
  "failures": [],
  "meta": {
    "durationMs": 0,
    "cached": false,
    "fallbackUsed": true
  }
}
```

Partial platform failures are reported in `failures`; working platforms still return results.

## Notes

- Web-player fallback links are best-effort search links, not guaranteed exact matches.
- Official APIs should be preferred whenever credentials are available.
- The adapter interface is intentionally small so new platform-specific APIs can be added without changing the frontend or endpoint contracts.
