import { z } from "zod";
import { normalizeCode } from "./normalization.js";
import { platformNames } from "./platforms.js";

/** Aceita ISRC com ou sem hífens/espaços; normaliza para alfanumérico maiúsculo antes de validar. */
export const isrcSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizeCode(value) : value),
  z.string().regex(/^[A-Z]{2}[A-Z0-9]{3}[0-9]{7}$/, "ISRC inválido (ex.: USRC17607839).")
);

/** Aceita UPC/EAN só com dígitos após remover separadores. */
export const upcSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.replace(/\D/g, "") : value),
  z.string().regex(/^[0-9]{8,14}$/, "UPC/EAN deve ter entre 8 e 14 dígitos.")
);

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
