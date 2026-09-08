import { describe, expect, it, vi } from "vitest";
import { PostgresProjectActionContextAdapter } from "./postgres-project-action-context.adapter.js";

describe("PostgresProjectActionContextAdapter", () => {
  it("loads and builds project action context for one project", async () => {
    const adapter = new PostgresProjectActionContextAdapter({
      findActiveProjectSummary: vi.fn().mockResolvedValue({
        id: "project-1",
        orgId: "org-1",
        title: "Commercial Scorecard v2",
        body: "Rollout planning",
        status: "active",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      findProjectRelatedNodeIds: vi.fn().mockResolvedValue(["task-1"]),
      findProjectActionContextChildNodes: vi.fn().mockResolvedValue([
        {
          id: "task-1",
          nodeType: "task",
          title: "Present Commercial Scorecard v2 to Amy for final sign off",
          body: "",
          status: "active",
          sortOrder: 0,
          createdAt: new Date("2026-01-01T00:00:00.000Z"),
          updatedAt: new Date("2026-01-02T00:00:00.000Z"),
          decisionDetails: null,
        },
      ]),
      findTaskIdsByNoteIds: vi.fn().mockResolvedValue([]),
    });

    const context = await adapter.get("project-1");

    expect(context.project).toEqual({
      id: "project-1",
      title: "Commercial Scorecard v2",
      description: "Rollout planning",
    });
    expect(context.openTasks).toHaveLength(1);
    expect(context.openTasks[0]?.id).toBe("task-1");
  });
});
