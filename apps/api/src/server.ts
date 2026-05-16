import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { createMusicSearchService } from "@music-link-finder/adapters";
import {
  searchAlbumRequestSchema,
  searchArtistRequestSchema,
  searchIsrcRequestSchema,
  searchTrackRequestSchema,
  searchUpcRequestSchema,
  searchUrlRequestSchema
} from "@music-link-finder/core";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import type { z, ZodTypeAny } from "zod";
import type { ApiEnv } from "./env.js";

export async function buildServer(env: ApiEnv): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug"
    }
  });
  const search = createMusicSearchService(process.env);

  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: false
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_TIME_WINDOW
  });

  app.setErrorHandler((error, _request, reply) => {
    app.log.error(error);
    const candidateStatusCode = (error as { statusCode?: unknown }).statusCode;
    const statusCode = typeof candidateStatusCode === "number" && candidateStatusCode >= 400 ? candidateStatusCode : 500;
    reply.status(statusCode).send({
      error: {
        code: statusCode === 429 ? "RATE_LIMITED" : "INTERNAL_ERROR",
        message: statusCode === 429 ? "Muitas requisições. Tente de novo em instantes." : "Erro interno inesperado no servidor."
      }
    });
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "music-link-finder-api",
    time: new Date().toISOString()
  }));

  app.get("/platforms", async () => ({
    platforms: search.getPlatformStatuses()
  }));

  app.post("/search/track", validate(searchTrackRequestSchema, (body) => search.searchTrack(body)));
  app.post("/search/album", validate(searchAlbumRequestSchema, (body) => search.searchAlbum(body)));
  app.post("/search/artist", validate(searchArtistRequestSchema, (body) => search.searchArtist(body)));
  app.post("/search/isrc", validate(searchIsrcRequestSchema, (body) => search.searchByIsrc(body)));
  app.post("/search/upc", validate(searchUpcRequestSchema, (body) => search.searchByUpc(body)));
  app.post("/search/url", validate(searchUrlRequestSchema, (body) => search.searchByUrl(body)));

  return app;
}

function validate<TSchema extends ZodTypeAny>(
  schema: TSchema,
  handler: (body: z.infer<TSchema>, request: FastifyRequest, reply: FastifyReply) => Promise<unknown>
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: "VALIDATION_ERROR",
          message: "Corpo da requisição inválido.",
          details: parsed.error.flatten()
        }
      });
    }

    return handler(parsed.data, request, reply);
  };
}
