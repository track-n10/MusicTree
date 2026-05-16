import { z } from "zod";

/** Render, Railway, etc. definem PORT; localmente usa-se API_PORT. */
function resolveListenPort(source: NodeJS.ProcessEnv): number {
  const raw = source.PORT ?? source.API_PORT ?? "4000";
  const port = Number.parseInt(String(raw), 10);
  return Number.isFinite(port) && port > 0 ? port : 4000;
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.number().int().positive(),
  API_HOST: z.string().default("0.0.0.0"),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_TIME_WINDOW: z.string().default("1 minute"),
  DEFAULT_MARKET: z.string().default("US")
});

export type ApiEnv = z.infer<typeof envSchema>;

export function readEnv(source: NodeJS.ProcessEnv = process.env): ApiEnv {
  return envSchema.parse({
    ...source,
    API_PORT: resolveListenPort(source)
  });
}
