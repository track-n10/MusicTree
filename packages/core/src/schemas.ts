import { z } from "zod";
import { platformNames } from "./platforms.js";

export const isrcSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/i, "ISRC must look like GBAHS1700024");

export const upcSchema = z
  .string()
  .trim()
  .regex(/^[0-9]{8,14}$/, "UPC/EAN must be 8 to 14 digits");

export const searchTrackRequestSchema = z.object({
  query: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(160).optional(),
  releaseType: z.enum(["track", "album"]).optional(),
  market: z.string().trim().length(2).optional()
});

export const searchAlbumRequestSchema = z.object({
  query: z.string().trim().min(1).max(200),
  artist: z.string().trim().min(1).max(160).optional(),
  market: z.string().trim().length(2).optional()
});

export const searchArtistRequestSchema = z.object({
  query: z.string().trim().min(1).max(160),
  market: z.string().trim().length(2).optional()
});

export const searchIsrcRequestSchema = z.object({
  isrc: isrcSchema,
  market: z.string().trim().length(2).optional()
});

export const searchUpcRequestSchema = z.object({
  upc: upcSchema,
  market: z.string().trim().length(2).optional()
});

export const searchUrlRequestSchema = z.object({
  url: z.string().trim().url(),
  market: z.string().trim().length(2).optional()
});

export const platformNameSchema = z.enum(platformNames);

export type SearchTrackRequest = z.infer<typeof searchTrackRequestSchema>;
export type SearchAlbumRequest = z.infer<typeof searchAlbumRequestSchema>;
export type SearchArtistRequest = z.infer<typeof searchArtistRequestSchema>;
export type SearchIsrcRequest = z.infer<typeof searchIsrcRequestSchema>;
export type SearchUpcRequest = z.infer<typeof searchUpcRequestSchema>;
export type SearchUrlRequest = z.infer<typeof searchUrlRequestSchema>;
