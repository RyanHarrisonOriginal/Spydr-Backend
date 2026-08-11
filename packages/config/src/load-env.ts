import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

/**
 * Load `.env` from cwd, an app package, or the monorepo root.
 */
export function loadEnv(): void {
  const configPackageRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    ".."
  );
  const monorepoRoot = resolve(configPackageRoot, "../..");

  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(monorepoRoot, "apps/api/.env"),
    resolve(monorepoRoot, "apps/worker/.env"),
    resolve(monorepoRoot, ".env"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path });
      return;
    }
  }
}

loadEnv();
