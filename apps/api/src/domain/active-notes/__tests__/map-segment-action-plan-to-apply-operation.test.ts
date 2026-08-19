import { describe, expect, it } from "vitest";
import {
  assertApplyPayloadMatchesKind,
  mapSegmentActionPlanToApplyOperation,
} from "../map-segment-action-plan-to-apply-operation.js";
import {
  ActiveNoteApplyError,
  type SegmentActionPlan,
} from "../types/index.js";
import { activeNoteApplyRequestSchema } from "../../../infra/http/schemas/active-notes.js";

const BASE_PLAN: Pick<
  SegmentActionPlan,
  "originalText" | "projectId" | "projectName"
> = {
  originalText: "Met with Amy today.",
  projectId: "project-1",
  projectName: "Commercial Scorecard v2",
};

describe("mapSegmentActionPlanToApplyOperation", () => {
  it("maps create_task to a task apply payload", () => {
    const plan: SegmentActionPlan = {
      ...BASE_PLAN,
      intent: "task_action",
      action: {
        type: "create_task",
        confidence: 0.9,
        reason: "New work is required.",
        payload: {
          title: "Add trend view",
          description: "Validate QTD calculations.",
        },
      },
    };

    expect(mapSegmentActionPlanToApplyOperation(plan, "op-1")).toEqual({
      operationId: "op-1",
      selected: true,
      objectType: "task",
      selectedProjectId: "project-1",
      payload: {
        kind: "task",
        projectId: "project-1",
        title: "Add trend view",
        description: "Validate QTD calculations.",
      },
    });
  });

  it("maps create_note using subject as note title", () => {
    const plan: SegmentActionPlan = {
      ...BASE_PLAN,
      intent: "project_context",
      action: {
        type: "create_note",
        confidence: 0.8,
        reason: "Preserve context.",
        payload: {
          subject: "Amy meeting",
          content: "Met with Amy today.",
        },
      },
    };

    expect(mapSegmentActionPlanToApplyOperation(plan, "op-2")).toMatchObject({
      objectType: "note",
      payload: {
        kind: "note",
        title: "Amy meeting",
        content: "Met with Amy today.",
      },
    });
  });

  it("maps attach_note_to_task with task attachment metadata", () => {
    const plan: SegmentActionPlan = {
      ...BASE_PLAN,
      taskId: "task-1",
      intent: "progress_update",
      action: {
        type: "attach_note_to_task",
        confidence: 0.91,
        reason: "Progress on sign-off task.",
        targetTaskId: "task-1",
        targetTaskTitle: "Present scorecard to Amy",
        payload: {
          subject: "Amy meeting",
          content: "Met with Amy today.",
        },
      },
    };

    expect(mapSegmentActionPlanToApplyOperation(plan, "op-3")).toEqual({
      operationId: "op-3",
      selected: true,
      objectType: "note",
      selectedProjectId: "project-1",
      payload: {
        kind: "note",
        projectId: "project-1",
        title: "Amy meeting",
        content: "Met with Amy today.",
      },
      attachment: {
        type: "task",
        id: "task-1",
      },
    });
  });

  it("maps create_decision and create_idea payloads", () => {
    expect(
      mapSegmentActionPlanToApplyOperation(
        {
          ...BASE_PLAN,
          intent: "decision",
          action: {
            type: "create_decision",
            confidence: 0.8,
            reason: "Committed choice.",
            payload: {
              title: "Use Snowflake fallback",
              rationale: "Power BI models are too restrictive.",
            },
          },
        },
        "op-4"
      ).payload
    ).toMatchObject({
      kind: "decision",
      title: "Use Snowflake fallback",
      rationale: "Power BI models are too restrictive.",
    });

    expect(
      mapSegmentActionPlanToApplyOperation(
        {
          ...BASE_PLAN,
          intent: "idea",
          action: {
            type: "create_idea",
            confidence: 0.7,
            reason: "Future direction.",
            payload: {
              title: "Shared app framework",
              description: "Standardize auth and deployment.",
            },
          },
        },
        "op-5"
      ).payload
    ).toMatchObject({
      kind: "idea",
      title: "Shared app framework",
      description: "Standardize auth and deployment.",
    });
  });

  it("maps use_existing_task as a note attached to the existing task", () => {
    expect(
      mapSegmentActionPlanToApplyOperation(
        {
          ...BASE_PLAN,
          intent: "task_action",
          action: {
            type: "use_existing_task",
            confidence: 0.85,
            reason: "Work already tracked.",
            targetTaskId: "task-9",
            targetTaskTitle: "Validate metrics",
          },
        },
        "op-6"
      )
    ).toMatchObject({
      objectType: "note",
      targetObjectId: "task-9",
      payload: {
        kind: "note",
        title: "Validate metrics",
        content: "Met with Amy today.",
        projectId: "project-1",
      },
      attachment: {
        type: "task",
        id: "task-9",
      },
    });
  });

  it("maps new project candidates to create-project apply operations", () => {
    expect(
      mapSegmentActionPlanToApplyOperation(
        {
          destination: "new_project_candidate",
          originalText: "Maybe we should create a reusable framework.",
          contextualText:
            "We should eventually create a reusable framework for internal apps.",
          topic: "Reusable framework",
          projectId: null,
          projectName: "Reusable Framework Development",
          confidence: 0.75,
          reason: "Distinct durable execution effort.",
        },
        "op-7"
      )
    ).toEqual({
      operationId: "op-7",
      selected: true,
      objectType: "project",
      payload: {
        kind: "project",
        title: "Reusable Framework Development",
        description:
          "We should eventually create a reusable framework for internal apps.",
      },
    });
  });

  it("maps unassigned segments to no_action apply operations", () => {
    expect(
      mapSegmentActionPlanToApplyOperation(
        {
          destination: "unassigned",
          originalText:
            "I decided that querying Snowflake directly should remain our preferred fallback.",
          contextualText:
            "I decided that querying Snowflake directly should remain our preferred fallback.",
          topic: "Querying Snowflake",
          projectId: null,
          projectName: null,
          confidence: 0.81,
          reason: "No qualifying existing Project owns this segment.",
        },
        "op-8"
      )
    ).toEqual({
      operationId: "op-8",
      selected: false,
      payload: {
        kind: "no_action",
        message: "No qualifying existing Project owns this segment.",
      },
    });
  });

  it("produces apply request payloads that match the HTTP schema", () => {
    const plans: SegmentActionPlan[] = [
      {
        ...BASE_PLAN,
        intent: "progress_update",
        action: {
          type: "attach_note_to_task",
          confidence: 0.9,
          reason: "Progress on sign-off task.",
          targetTaskId: "task-1",
          targetTaskTitle: "Present scorecard to Amy",
          payload: {
            subject: "Amy meeting",
            content: "Met with Amy today.",
          },
        },
      },
      {
        ...BASE_PLAN,
        intent: "task_action",
        action: {
          type: "create_task",
          confidence: 0.9,
          reason: "New work is required.",
          payload: {
            title: "Add trend view",
            description: "Validate QTD calculations.",
          },
        },
      },
      {
        ...BASE_PLAN,
        intent: "decision",
        action: {
          type: "create_decision",
          confidence: 0.8,
          reason: "Committed choice.",
          payload: {
            title: "Use Snowflake fallback",
            rationale: "Power BI models are too restrictive.",
          },
        },
      },
      {
        ...BASE_PLAN,
        intent: "idea",
        action: {
          type: "create_idea",
          confidence: 0.7,
          reason: "Future direction.",
          payload: {
            title: "Shared app framework",
            description: "Standardize auth and deployment.",
          },
        },
      },
      {
        ...BASE_PLAN,
        intent: "task_action",
        action: {
          type: "use_existing_task",
          confidence: 0.85,
          reason: "Work already tracked.",
          targetTaskId: "task-9",
          targetTaskTitle: "Validate metrics",
        },
      },
      {
        destination: "new_project_candidate",
        originalText: "Maybe we should create a reusable framework.",
        contextualText:
          "We should eventually create a reusable framework for internal apps.",
        topic: "Reusable framework",
        projectId: null,
        projectName: "Reusable Framework Development",
        confidence: 0.75,
        reason: "Distinct durable execution effort.",
      },
    ];

    const operations = plans.map((plan, index) =>
      mapSegmentActionPlanToApplyOperation(plan, `op-${index}`)
    );

    expect(
      activeNoteApplyRequestSchema.parse({
        activeNoteId: "note-1",
        content: "Active note",
        operations,
      })
    ).toMatchObject({ operations });

    for (const operation of operations) {
      expect(() =>
        assertApplyPayloadMatchesKind(operation.payload)
      ).not.toThrow();
    }
  });
});

describe("assertApplyPayloadMatchesKind", () => {
  it("requires the fields each Spydr object type needs", () => {
    expect(() =>
      assertApplyPayloadMatchesKind({ kind: "task", title: "  " })
    ).toThrow(ActiveNoteApplyError);

    expect(() =>
      assertApplyPayloadMatchesKind({ kind: "note" })
    ).toThrow(/title or content/);

    expect(() =>
      assertApplyPayloadMatchesKind({
        kind: "note",
        title: "Subject",
        content: "Body",
      })
    ).not.toThrow();

    expect(() =>
      assertApplyPayloadMatchesKind({
        kind: "note",
        subject: "Meeting update with Amy",
        content: "Met with Amy today.",
      })
    ).not.toThrow();
  });
});
