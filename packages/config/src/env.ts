import "./load-env.js";

import type { RedisEnvConfig } from "./types.js";

export function loadRedisEnv(): RedisEnvConfig {
  const url = process.env.REDIS_URL?.trim() || undefined;
  const password = process.env.REDIS_PASSWORD?.trim() || undefined;

  return {
    url,
    host: process.env.REDIS_HOST?.trim() || "127.0.0.1",
    port: Number(process.env.REDIS_PORT ?? 6379),
    password,
    tls: process.env.REDIS_TLS === "true",
  };
}

export function getWorkerConcurrency(): number {
  const parsed = Number(process.env.WORKER_CONCURRENCY ?? 5);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 5;
  }

  return Math.floor(parsed);
}
