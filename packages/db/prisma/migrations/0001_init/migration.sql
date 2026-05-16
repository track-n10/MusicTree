CREATE TYPE "EntityType" AS ENUM ('TRACK', 'ALBUM', 'ARTIST');
CREATE TYPE "ArtistRole" AS ENUM ('MAIN', 'FEATURED', 'PRODUCER', 'REMIXER');
CREATE TYPE "ReleaseType" AS ENUM ('SINGLE', 'EP', 'ALBUM', 'COMPILATION', 'UNKNOWN');
CREATE TYPE "SearchMode" AS ENUM ('TRACK', 'ALBUM', 'ISRC', 'UPC', 'URL', 'ARTIST');
CREATE TYPE "SearchStatus" AS ENUM ('SUCCESS', 'PARTIAL', 'FAILED');

CREATE TABLE "Artist" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Artist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Album" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "normalizedTitle" TEXT NOT NULL,
  "upc" TEXT,
  "releaseType" "ReleaseType" NOT NULL DEFAULT 'UNKNOWN',
  "releaseDate" TIMESTAMP(3),
  "coverImageUrl" TEXT,
  "mainArtistId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Track" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "normalizedTitle" TEXT NOT NULL,
  "isrc" TEXT,
  "durationMs" INTEGER,
  "releaseDate" TIMESTAMP(3),
  "coverImageUrl" TEXT,
  "explicit" BOOLEAN,
  "mainArtistId" TEXT,
  "albumId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Track_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrackArtist" (
  "trackId" TEXT NOT NULL,
  "artistId" TEXT NOT NULL,
  "role" "ArtistRole" NOT NULL DEFAULT 'FEATURED',
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "TrackArtist_pkey" PRIMARY KEY ("trackId", "artistId", "role")
);

CREATE TABLE "AlbumTrack" (
  "albumId" TEXT NOT NULL,
  "trackId" TEXT NOT NULL,
  "discNumber" INTEGER NOT NULL DEFAULT 1,
  "trackNumber" INTEGER NOT NULL,
  CONSTRAINT "AlbumTrack_pkey" PRIMARY KEY ("albumId", "trackId")
);

CREATE TABLE "PlatformLink" (
  "id" TEXT NOT NULL,
  "entityType" "EntityType" NOT NULL,
  "entityId" TEXT NOT NULL,
  "platformName" TEXT NOT NULL,
  "platformEntityId" TEXT,
  "url" TEXT NOT NULL,
  "country" TEXT,
  "extraMetadata" JSONB,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SearchRun" (
  "id" TEXT NOT NULL,
  "mode" "SearchMode" NOT NULL,
  "query" TEXT NOT NULL,
  "status" "SearchStatus" NOT NULL,
  "partialFailures" JSONB,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Artist_normalizedName_idx" ON "Artist"("normalizedName");
CREATE INDEX "Album_upc_idx" ON "Album"("upc");
CREATE INDEX "Album_normalizedTitle_idx" ON "Album"("normalizedTitle");
CREATE INDEX "Track_isrc_idx" ON "Track"("isrc");
CREATE INDEX "Track_normalizedTitle_idx" ON "Track"("normalizedTitle");
CREATE INDEX "TrackArtist_artistId_idx" ON "TrackArtist"("artistId");
CREATE INDEX "AlbumTrack_trackId_idx" ON "AlbumTrack"("trackId");
CREATE UNIQUE INDEX "PlatformLink_entityType_entityId_platformName_url_key" ON "PlatformLink"("entityType", "entityId", "platformName", "url");
CREATE INDEX "PlatformLink_platformName_idx" ON "PlatformLink"("platformName");
CREATE INDEX "PlatformLink_entityType_entityId_idx" ON "PlatformLink"("entityType", "entityId");
CREATE INDEX "SearchRun_mode_createdAt_idx" ON "SearchRun"("mode", "createdAt");

ALTER TABLE "Album" ADD CONSTRAINT "Album_mainArtistId_fkey" FOREIGN KEY ("mainArtistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Track" ADD CONSTRAINT "Track_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Track" ADD CONSTRAINT "Track_mainArtistId_fkey" FOREIGN KEY ("mainArtistId") REFERENCES "Artist"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrackArtist" ADD CONSTRAINT "TrackArtist_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrackArtist" ADD CONSTRAINT "TrackArtist_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "Artist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlbumTrack" ADD CONSTRAINT "AlbumTrack_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlbumTrack" ADD CONSTRAINT "AlbumTrack_trackId_fkey" FOREIGN KEY ("trackId") REFERENCES "Track"("id") ON DELETE CASCADE ON UPDATE CASCADE;
