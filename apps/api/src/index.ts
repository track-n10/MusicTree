import "dotenv/config";
import { readEnv } from "./env.js";
import { buildServer } from "./server.js";

const env = readEnv();
const app = await buildServer(env);

try {
  await app.listen({ host: env.API_HOST, port: env.API_PORT });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
