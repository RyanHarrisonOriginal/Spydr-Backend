import { describe, expect, it } from "vitest";
import { setTaskIdForAttachNoteAction } from "../set-task-id-for-attach-note-action.js";
import type { SegmentActionPlan } from "../types/index.js";

describe("setTaskIdForAttachNoteAction", () => {
  it("adds taskId for attach_note_to_task actions", () => {
    const plan: SegmentActionPlan = {
      originalText: "Met with Amy today.",
      projectId: "project-1",
      projectName: "Commercial Scorecard v2",
      intent: "progress_update",
      action: {
        type: "attach_note_to_task",
        confidence: 0.9,
        reason: "Progress update for an open task.",
        targetTaskId: "task-1",
        targetTaskTitle: "Present scorecard to Amy",
        payload: {
          subject: "Amy meeting",
          content: "Met with Amy today.",
        },
      },
    };

    expect(setTaskIdForAttachNoteAction(plan)).toEqual({
      ...plan,
      taskId: "task-1",
    });
  });

  it("leaves other action types unchanged", () => {
    const plan: SegmentActionPlan = {
      originalText: "Add a trend view.",
      projectId: "project-1",
      projectName: "Commercial Scorecard v2",
      intent: "task_action",
      action: {
        type: "create_task",
        confidence: 0.9,
        reason: "New work is required.",
        payload: {
          title: "Add trend view",
        },
      },
    };

    expect(setTaskIdForAttachNoteAction(plan)).toBe(plan);
  });
});
