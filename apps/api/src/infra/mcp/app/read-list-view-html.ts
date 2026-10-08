import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the Vite singlefile bundle for `ui://spydr/list-view`.
 * Works from tsx (src/) and compiled dist/ when ui-dist lives under src.
 */
export async function readListViewHtml(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(moduleDir, "ui-dist", "index.html"),
    // Running compiled JS from apps/api/dist/infra/mcp/app/
    path.resolve(moduleDir, "../../../../src/infra/mcp/app/ui-dist/index.html"),
  ];

  const errors: string[] = [];
  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf-8");
    } catch (error) {
      errors.push(
        `${candidate}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  throw new Error(
    `MCP list-view HTML not found. Run \`npm run build:mcp-app -w @spydr/api\`.\n${errors.join("\n")}`
  );
}
