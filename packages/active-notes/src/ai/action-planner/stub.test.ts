import { describe, expect, it } from "vitest";
import { inferStubSegmentActionPlan } from "./stub.js";
import type {
  ExistingProjectRoutedSegment,
  ProjectActionContext,
} from "../../domain/types/index.js";

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
