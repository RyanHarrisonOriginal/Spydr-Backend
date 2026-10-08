import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EMBEDDED_LIST_VIEW_HTML } from "./list-view-html.generated.js";

/**
 * Resolve the Vite singlefile bundle for `ui://spydr/list-view`.
 * Prefer on-disk ui-dist when present; fall back to the build-time embed so
 * production never fails resources/read because the HTML file was omitted.
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

  for (const candidate of candidates) {
    try {
      return await fs.readFile(candidate, "utf-8");
    } catch {
      // try next
    }
  }

  if (EMBEDDED_LIST_VIEW_HTML.length > 0) {
    return EMBEDDED_LIST_VIEW_HTML;
  }

  throw new Error(
    "MCP list-view HTML not found. Run `npm run build:mcp-app -w @spydr/api`."
  );
}
