import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve the Vite singlefile bundle for `ui://spydr/list-view`.
 *
 * Candidates cover:
 * - tsx from src/
 * - compiled dist/ with ui-dist copied beside the JS (production)
 * - full checkout where ui-dist still lives under src/
 */
export async function readListViewHtml(): Promise<string> {
  const moduleDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.join(moduleDir, "ui-dist", "index.html"),
    path.resolve(moduleDir, "../../../../src/infra/mcp/app/ui-dist/index.html"),
    path.resolve(process.cwd(), "src/infra/mcp/app/ui-dist/index.html"),
    path.resolve(process.cwd(), "apps/api/src/infra/mcp/app/ui-dist/index.html"),
    path.resolve(process.cwd(), "dist/infra/mcp/app/ui-dist/index.html"),
    path.resolve(process.cwd(), "apps/api/dist/infra/mcp/app/ui-dist/index.html"),
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
    `MCP list-view HTML not found. Run \`npm run build:mcp-app -w @spydr/api\` (and full api build for production copy).\n${errors.join("\n")}`
  );
}
