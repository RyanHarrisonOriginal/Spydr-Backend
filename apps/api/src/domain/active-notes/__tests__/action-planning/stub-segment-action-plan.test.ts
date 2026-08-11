import { describe, expect, it } from "vitest";
import { inferStubSegmentActionPlan } from "../../action-planning/helpers/stub-segment-action-plan.js";
import type { ExistingProjectRoutedSegment } from "../../action-planning/types/index.js";
import type { ProjectActionContext } from "../../action-planning/types/project-action-context.types.js";

describe("inferStubSegmentActionPlan", () => {
  it("prefers attach_note_to_task when the segment directly addresses an open task", () => {
    const routedSegment: ExistingProjectRoutedSegment = {
      originalText:
        "Met with Amy today about the present commercial scorecard v2 to amy for final sign off meeting.",
      destination: "existing_project",
      projectId: "project-1",
      projectName: "Commercial Scorecard v2",
      matchBasis: "existing_task",
      confidence: 0.96,
      reason: "Matched project.",
    };

    const projectContext: ProjectActionContext = {
      project: {
        id: "project-1",
        title: "Commercial Scorecard v2",
      },
      openTasks: [
        {
          id: "task-1",
          title: "Present Commercial Scorecard v2 to Amy for final sign off",
          status: "active",
          updatedAt: "2026-01-02T00:00:00.000Z",
        },
      ],
      recentTasks: [],
      recentNotes: [],
      recentDecisions: [],
      recentIdeas: [],
    };

    expect(inferStubSegmentActionPlan(routedSegment, projectContext)).toMatchObject({
      intent: "progress_update",
      action: {
        type: "attach_note_to_task",
        targetTaskId: "task-1",
      },
    });
  });
});
