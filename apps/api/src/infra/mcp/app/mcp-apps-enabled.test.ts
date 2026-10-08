import { afterEach, describe, expect, it } from "vitest";
import { mcpAppsEnabled } from "./mcp-apps-enabled.js";
import { listViewResult } from "../result.js";

describe("mcpAppsEnabled", () => {
  const previous = process.env.MCP_APPS_ENABLED;

  afterEach(() => {
    if (previous === undefined) delete process.env.MCP_APPS_ENABLED;
    else process.env.MCP_APPS_ENABLED = previous;
  });

  it("defaults to disabled", () => {
    delete process.env.MCP_APPS_ENABLED;
    expect(mcpAppsEnabled()).toBe(false);
  });

  it("enables on true/1/yes", () => {
    process.env.MCP_APPS_ENABLED = "true";
    expect(mcpAppsEnabled()).toBe(true);
    process.env.MCP_APPS_ENABLED = "1";
    expect(mcpAppsEnabled()).toBe(true);
  });
});

describe("listViewResult without apps", () => {
  const previous = process.env.MCP_APPS_ENABLED;

  afterEach(() => {
    if (previous === undefined) delete process.env.MCP_APPS_ENABLED;
    else process.env.MCP_APPS_ENABLED = previous;
  });

  it("omits ui _meta when apps are disabled", () => {
    delete process.env.MCP_APPS_ENABLED;
    const result = listViewResult({
      version: 1,
      kind: "tasks",
      items: [],
    });
    expect(result._meta).toBeUndefined();
    expect(result.structuredContent).toBeDefined();
  });
});
