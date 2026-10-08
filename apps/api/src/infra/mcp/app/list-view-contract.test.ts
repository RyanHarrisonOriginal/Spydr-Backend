import { describe, expect, it } from "vitest";
import {
  SPYDR_LIST_VIEW_CONTRACT_VERSION,
  SPYDR_LIST_VIEW_RESOURCE_URI,
  isSpydrListViewResult,
  type SpydrListViewResult,
} from "./list-view-contract.js";

describe("list-view-contract", () => {
  it("exposes a stable versioned URI", () => {
    expect(SPYDR_LIST_VIEW_CONTRACT_VERSION).toBe(1);
    expect(SPYDR_LIST_VIEW_RESOURCE_URI).toBe("ui://spydr/list-view");
  });

  it("accepts a valid projects result", () => {
    const result: SpydrListViewResult = {
      version: 1,
      kind: "projects",
      items: [
        {
          id: "p1",
          name: "Launch",
          status: "active",
          priority: "high",
          assignee: "Ada",
          dueDate: null,
          project: null,
          emoji: "🚀",
          target: "2026-06-01",
        },
      ],
    };
    expect(isSpydrListViewResult(result)).toBe(true);
  });

  it("rejects wrong version or kind", () => {
    expect(
      isSpydrListViewResult({ version: 2, kind: "projects", items: [] })
    ).toBe(false);
    expect(
      isSpydrListViewResult({ version: 1, kind: "notes", items: [] })
    ).toBe(false);
    expect(isSpydrListViewResult(null)).toBe(false);
  });
});
