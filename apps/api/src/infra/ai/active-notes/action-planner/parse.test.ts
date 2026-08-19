import { describe, expect, it } from "vitest";
import { parseSegmentActionPlanOutput } from "./parse.js";
import type {
  ExistingProjectRoutedSegment,
  ProjectActionContext,
} from "../../../../domain/active-notes/types/index.js";

const ROUTED_SEGMENT: ExistingProjectRoutedSegment = {
  originalText: "Met with Amy today about the Commercial Scorecard rollout.",
  destination: "existing_project",
  projectId: "project-1",
  projectName: "Commercial Scorecard v2",
  matchBasis: "direct_project_reference",
  confidence: 0.96,
  reason: "Directly references the Commercial Scorecard rollout.",
};

const PROJECT_CONTEXT: ProjectActionContext = {
  project: {
    id: "project-1",
    title: "Commercial Scorecard v2",
    description: "Rollout planning",
  },
  openTasks: [
    {
      id: "task-1",
      title: "Present Commercial Scorecard v2 to Amy for final sign off",
      description: null,
      status: "active",
      updatedAt: "2026-01-02T00:00:00.000Z",
    },
  ],
  recentTasks: [],
  recentNotes: [],
  recentDecisions: [],
  recentIdeas: [],
};

describe("parseSegmentActionPlanOutput", () => {
  it("accepts a valid attach_note_to_task plan", () => {
    expect(
      parseSegmentActionPlanOutput(
        {
          originalText: ROUTED_SEGMENT.originalText,
          projectId: "project-1",
          projectName: "Commercial Scorecard v2",
          intent: "progress_update",
          action: {
            type: "attach_note_to_task",
            confidence: 0.91,
            reason: "The segment describes activity related to the Amy sign-off task.",
            targetTaskId: "task-1",
            targetTaskTitle:
              "Present Commercial Scorecard v2 to Amy for final sign off",
            payload: {
              subject: "Amy Meeting",
              content:
                "Met with Amy today about the Commercial Scorecard rollout.",
            },
          },
        },
        ROUTED_SEGMENT,
        PROJECT_CONTEXT
      )
    ).toMatchObject({
      intent: "progress_update",
      action: {
        type: "attach_note_to_task",
        targetTaskId: "task-1",
      },
    });
  });

  it("downgrades invented task ids to create_note", () => {
    expect(
      parseSegmentActionPlanOutput(
        {
          originalText: ROUTED_SEGMENT.originalText,
          projectId: "project-1",
          projectName: "Commercial Scorecard v2",
          intent: "progress_update",
          action: {
            type: "attach_note_to_task",
            confidence: 0.91,
            reason: "Invalid task.",
            targetTaskId: "missing-task",
            targetTaskTitle: "Missing Task",
            payload: {
              subject: "Amy Meeting",
              content: ROUTED_SEGMENT.originalText,
            },
          },
        },
        ROUTED_SEGMENT,
        PROJECT_CONTEXT
      )
    ).toMatchObject({
      intent: "progress_update",
      action: {
        type: "create_note",
        payload: {
          subject: "Amy Meeting",
          content: ROUTED_SEGMENT.originalText,
        },
      },
    });
  });

  it("keeps long generated titles exactly as returned", () => {
    const title =
      "Add a rep-level trend view and validate the quarter-to-date calculations before presenting";

    expect(
      parseSegmentActionPlanOutput(
        {
          originalText: ROUTED_SEGMENT.originalText,
          projectId: "project-1",
          projectName: "Commercial Scorecard v2",
          intent: "task_action",
          action: {
            type: "create_task",
            confidence: 0.9,
            reason: "The segment establishes remaining work.",
            payload: {
              title,
              description:
                "Add a rep-level trend view and validate QTD calculations.",
            },
          },
        },
        ROUTED_SEGMENT,
        PROJECT_CONTEXT
      )
    ).toMatchObject({
      intent: "task_action",
      action: {
        type: "create_task",
        payload: {
          title,
        },
      },
    });
  });

  it("keeps long note subjects exactly as returned", () => {
    const subject =
      "Meeting update with Amy about the Commercial Scorecard rollout direction";

    expect(
      parseSegmentActionPlanOutput(
        {
          originalText: ROUTED_SEGMENT.originalText,
          projectId: "project-1",
          projectName: "Commercial Scorecard v2",
          intent: "progress_update",
          action: {
            type: "create_note",
            confidence: 0.88,
            reason: "Preserve the meeting outcome.",
            payload: {
              subject,
              content: ROUTED_SEGMENT.originalText,
            },
          },
        },
        ROUTED_SEGMENT,
        PROJECT_CONTEXT
      )
    ).toMatchObject({
      action: {
        type: "create_note",
        payload: {
          subject,
          content: ROUTED_SEGMENT.originalText,
        },
      },
    });
  });

  it("normalizes targetTaskTitle from project context when the task id is valid", () => {
    expect(
      parseSegmentActionPlanOutput(
        {
          originalText: ROUTED_SEGMENT.originalText,
          projectId: "project-1",
          projectName: "Commercial Scorecard v2",
          intent: "progress_update",
          action: {
            type: "attach_note_to_task",
            confidence: 0.91,
            reason: "Progress on Amy sign-off.",
            targetTaskId: "task-1",
            targetTaskTitle: "Wrong title",
            payload: {
              subject: "Amy Meeting",
              content: ROUTED_SEGMENT.originalText,
            },
          },
        },
        ROUTED_SEGMENT,
        PROJECT_CONTEXT
      )
    ).toMatchObject({
      action: {
        type: "attach_note_to_task",
        targetTaskId: "task-1",
        targetTaskTitle:
          "Present Commercial Scorecard v2 to Amy for final sign off",
      },
    });
  });
});
