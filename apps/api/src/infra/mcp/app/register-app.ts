/**
 * Thin MCP Apps registration helpers compatible with `@modelcontextprotocol/server` v2.
 *
 * `@modelcontextprotocol/ext-apps/server`'s `registerAppTool` / `registerAppResource`
 * still type against `@modelcontextprotocol/sdk` (v1-shaped callbacks). Spydr is on
 * the split v2 packages, so we mirror those helpers locally: normalize
 * `_meta.ui.resourceUri` (+ legacy `ui/resourceUri`) and default the Apps MIME.
 */
import {
  RESOURCE_MIME_TYPE,
  RESOURCE_URI_META_KEY,
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/server";

export function registerSpydrAppTool(
  server: McpServer,
  name: string,
  config: {
    title?: string;
    description?: string;
    inputSchema?: unknown;
    outputSchema?: unknown;
    annotations?: Record<string, unknown>;
    _meta: {
      ui: {
        resourceUri: string;
        visibility?: Array<"model" | "app">;
      };
      [key: string]: unknown;
    };
  },
  handler: unknown
): void {
  const resourceUri = config._meta.ui.resourceUri;
  // Overload generics on registerTool are awkward to forward; runtime shape matches
  // existing plain registerTool calls in this file.
  (server.registerTool as (name: string, config: unknown, cb: unknown) => unknown)(
    name,
    {
      title: config.title,
      description: config.description,
      inputSchema: config.inputSchema,
      outputSchema: config.outputSchema,
      annotations: config.annotations,
      _meta: {
        ...config._meta,
        ui: config._meta.ui,
        [RESOURCE_URI_META_KEY]: resourceUri,
      },
    },
    handler
  );
}

export function registerSpydrAppResource(
  server: McpServer,
  name: string,
  uri: string,
  config: {
    description?: string;
    mimeType?: string;
  },
  readCallback: unknown
): void {
  (server.registerResource as (
    name: string,
    uri: string,
    config: unknown,
    cb: unknown
  ) => unknown)(
    name,
    uri,
    {
      description: config.description,
      mimeType: config.mimeType ?? RESOURCE_MIME_TYPE,
    },
    readCallback
  );
}

export { RESOURCE_MIME_TYPE };
