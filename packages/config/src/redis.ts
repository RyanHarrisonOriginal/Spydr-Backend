import type { ConnectionOptions } from "bullmq";
import { loadRedisEnv } from "./env.js";

export function createRedisConnectionOptions(): ConnectionOptions {
  const config = loadRedisEnv();

  if (config.url) {
    return {
      url: config.url,
      maxRetriesPerRequest: null,
    };
  }

  return {
    host: config.host,
    port: config.port,
    password: config.password,
    tls: config.tls ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}
