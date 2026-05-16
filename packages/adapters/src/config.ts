import { platformConfigs, type PlatformConfig } from "@music-link-finder/core";

export type RuntimeConfig = {
  env: NodeJS.ProcessEnv;
  defaultMarket: string;
  webPlayerFallbackEnabled: boolean;
};

export function createRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  return {
    env,
    defaultMarket: env.DEFAULT_MARKET ?? "US",
    webPlayerFallbackEnabled: (env.WEB_PLAYER_FALLBACK_ENABLED ?? "true").toLowerCase() !== "false"
  };
}

export function hasCredentials(config: PlatformConfig, env: NodeJS.ProcessEnv): boolean {
  if (config.credentialKeys.length === 0) return true;
  return config.credentialKeys.every((key) => Boolean(env[key]?.trim()));
}

export function configuredPlatforms(env: NodeJS.ProcessEnv): PlatformConfig[] {
  return platformConfigs.filter((platform) => hasCredentials(platform, env));
}
