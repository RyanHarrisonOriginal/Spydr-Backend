import { afterEach, describe, expect, it } from "vitest";
import type { SpydrListViewResult } from "./list-view-contract.js";
import { shouldAttachListUi } from "./list-view-ui.js";

function sample(items = 1): SpydrListViewResult {
  return {
    version: 1,
    kind: "tasks",
    items: Array.from({ length: items }, (_, index) => ({
      id: `t${index}`,
      name: `Task ${index}`,
      status: "active",
      priority: "medium",
      assignee: null,
      dueDate: null,
      project: null,
      emoji: null,
      target: null,
    })),
  };
}

describe("shouldAttachListUi", () => {
  const previous = process.env.MCP_APPS_ENABLED;

  afterEach(() => {
    if (previous === undefined) delete process.env.MCP_APPS_ENABLED;
    else process.env.MCP_APPS_ENABLED = previous;
  });

  it("never attaches when apps are disabled", () => {
    delete process.env.MCP_APPS_ENABLED;
    expect(shouldAttachListUi({ status: "active" }, sample())).toBe(false);
  });

  it("attaches for present/app mode and focused get queries", () => {
    process.env.MCP_APPS_ENABLED = "true";
    expect(shouldAttachListUi({ mode: "app" }, sample())).toBe(true);
    expect(shouldAttachListUi({ status: "active" }, sample())).toBe(true);
    expect(shouldAttachListUi({ assignee: "Ada" }, sample())).toBe(true);
    expect(shouldAttachListUi({ id: "t1" }, sample())).toBe(true);
    expect(shouldAttachListUi({ ui: true }, sample())).toBe(true);
  });

  it("skips text mode and broad unfiltered dumps", () => {
    process.env.MCP_APPS_ENABLED = "true";
    expect(shouldAttachListUi({ mode: "text", status: "active" }, sample())).toBe(
      false
    );
    expect(shouldAttachListUi({}, sample(20))).toBe(false);
    expect(shouldAttachListUi({ ui: false, status: "active" }, sample())).toBe(
      false
    );
    expect(shouldAttachListUi({ status: "active" }, sample(0))).toBe(false);
  });
});
