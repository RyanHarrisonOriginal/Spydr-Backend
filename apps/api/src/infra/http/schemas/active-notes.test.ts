import { describe, expect, it } from "vitest";
import { activeNoteApplyRequestSchema } from "./active-notes.js";

/** Shape the frontend POST /api/active-notes/apply actually sends. */
const frontendApplyBody = {
  activeNoteId: "draft-note-1",
  content: "Met with Amy today about the scorecard.",
  projectId: null,
  operations: [
    {
      operationId: "op-0",
      selected: true,
      objectType: "note",
      payload: {
        kind: "note",
        title: "Meeting update with Amy",
        content: "Met with Amy today about the scorecard.",
        projectId: "proj-scorecard",
      },
      selectedProjectId: "proj-scorecard",
      projectRef: null,
      duplicateResolution: null,
      targetObjectId: "task-signoff",
      attachment: { type: "task", id: "task-signoff", ref: null },
    },
    {
      operationId: "op-1",
      selected: true,
      objectType: "task",
      payload: {
        kind: "task",
        title: "Add rep-level trend view",
        description: "Validate QTD calculations.",
        projectId: "proj-scorecard",
      },
      selectedProjectId: "proj-scorecard",
      projectRef: null,
      duplicateResolution: null,
      targetObjectId: null,
      attachment: null,
    },
    {
      operationId: "op-2",
      selected: false,
      objectType: "idea",
      payload: {
        kind: "idea",
        title: "Querying Snowflake",
        description: "Keep Snowflake as the fallback.",
        projectId: null,
      },
      selectedProjectId: null,
      projectRef: null,
      duplicateResolution: null,
      targetObjectId: null,
      attachment: null,
    },
    {
      operationId: "op-3",
      selected: true,
      objectType: "project",
      payload: {
        kind: "project",
        title: "Inventory App Alignment",
        description: "Align with the Florida team.",
      },
      selectedProjectId: null,
      projectRef: null,
      duplicateResolution: null,
      targetObjectId: null,
      attachment: null,
    },
    {
      operationId: "op-4",
      selected: true,
      objectType: "person",
      payload: {
        kind: "person",
        title: "Amy Chen",
        name: "Amy Chen",
        description: "Stakeholder for scorecard sign-off.",
      },
      selectedProjectId: null,
      projectRef: null,
      duplicateResolution: null,
      targetObjectId: null,
      attachment: null,
    },
  ],
};

describe("activeNoteApplyRequestSchema", () => {
  it("accepts the frontend apply payload shape", () => {
    const parsed = activeNoteApplyRequestSchema.parse(frontendApplyBody);
    expect(parsed.operations).toHaveLength(5);
    expect(parsed.projectId).toBeNull();
    expect(parsed.operations[0]?.attachment).toMatchObject({
      type: "task",
      id: "task-signoff",
    });
    expect(parsed.operations[1]?.targetObjectId).toBeNull();
  });

  it("coerces empty ID strings to null instead of failing", () => {
    const parsed = activeNoteApplyRequestSchema.parse({
      activeNoteId: "",
      content: "Note",
      projectId: "   ",
      operations: [
        {
          operationId: "op-1",
          selected: true,
          objectType: "task",
          payload: {
            kind: "task",
            title: "A task",
            projectId: "",
          },
          selectedProjectId: "",
          projectRef: "",
          duplicateResolution: null,
          targetObjectId: "",
          attachment: { type: "task", id: "", ref: "" },
        },
      ],
    });

    expect(parsed.activeNoteId).toBeNull();
    expect(parsed.projectId).toBeNull();
    expect(parsed.operations[0]?.selectedProjectId).toBeNull();
    expect(parsed.operations[0]?.projectRef).toBeNull();
    expect(parsed.operations[0]?.targetObjectId).toBeNull();
    expect(parsed.operations[0]?.payload.projectId).toBeNull();
    expect(parsed.operations[0]?.attachment?.id).toBeNull();
  });
});
