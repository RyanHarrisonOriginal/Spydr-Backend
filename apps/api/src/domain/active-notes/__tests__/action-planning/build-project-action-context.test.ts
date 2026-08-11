import { SpydrNodeStatus, SpydrNodeType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { buildProjectActionContext } from "../../action-planning/helpers/build-project-action-context.js";
import type { ProjectActionContextChildNode } from "@spydr/db";

function createTask(
  overrides: Partial<ProjectActionContextChildNode> = {}
): ProjectActionContextChildNode {
  return {
    id: "task-1",
    nodeType: SpydrNodeType.task,
    title: "Present Commercial Scorecard v2 to Amy for final sign off",
    body: "",
    status: SpydrNodeStatus.active,
    sortOrder: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    decisionDetails: null,
    ...overrides,
  };
}

describe("buildProjectActionContext", () => {
  it("builds open tasks, recent collections, and note task links", () => {
    const context = buildProjectActionContext({
      project: {
        id: "project-1",
        title: "Commercial Scorecard v2",
        body: "Rollout planning",
      },
      childNodes: [
        createTask(),
        createTask({
          id: "task-2",
          title: "Validate quarter-to-date calculations",
          status: SpydrNodeStatus.completed,
          updatedAt: new Date("2026-01-03T00:00:00.000Z"),
        }),
        {
          id: "note-1",
          nodeType: SpydrNodeType.note,
          title: "Amy Meeting",
          body: "Met with Amy today.",
          status: SpydrNodeStatus.active,
          sortOrder: 0,
          createdAt: new Date("2026-01-04T00:00:00.000Z"),
          updatedAt: new Date("2026-01-04T00:00:00.000Z"),
          decisionDetails: null,
        },
        {
          id: "decision-1",
          nodeType: SpydrNodeType.decision,
          title: "Use Snowflake fallback",
          body: "",
          status: SpydrNodeStatus.active,
          sortOrder: 0,
          createdAt: new Date("2026-01-05T00:00:00.000Z"),
          updatedAt: new Date("2026-01-05T00:00:00.000Z"),
          decisionDetails: {
            decidedAt: new Date("2026-01-05T00:00:00.000Z"),
            rationale: "Power BI models are too restrictive.",
          },
        },
      ],
      noteTaskIdsByNoteId: new Map([["note-1", "task-1"]]),
    });

    expect(context.project).toEqual({
      id: "project-1",
      title: "Commercial Scorecard v2",
      description: "Rollout planning",
    });
    expect(context.openTasks).toHaveLength(1);
    expect(context.recentTasks).toHaveLength(2);
    expect(context.recentNotes[0]).toMatchObject({
      id: "note-1",
      subject: "Amy Meeting",
      taskId: "task-1",
    });
    expect(context.recentDecisions[0]).toMatchObject({
      id: "decision-1",
      title: "Use Snowflake fallback",
      rationale: "Power BI models are too restrictive.",
    });
  });
});
