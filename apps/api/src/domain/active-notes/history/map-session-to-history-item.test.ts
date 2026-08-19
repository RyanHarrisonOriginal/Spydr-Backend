import { describe, expect, it } from "vitest";
import {
  buildReviewSnapshot,
  mapSessionToHistoryItem,
} from "./map-session-to-history-item.js";

describe("mapSessionToHistoryItem", () => {
  it("maps pending suggestions from analyzeResponse when no review snapshot exists", () => {
    const item = mapSessionToHistoryItem({
      id: "session-1",
      content: "Throw more teeps tonight.",
      status: "review",
      createdAt: "2026-08-18T12:00:00.000Z",
      updatedAt: "2026-08-18T12:05:00.000Z",
      completedAt: null,
      analyzeResponse: {
        segments: [],
        actionPlans: [
          {
            originalText: "Throw more teeps tonight.",
            topic: "Teep practice",
            projectId: "proj-1",
            projectName: "Muay Thai",
            intent: "task_action",
            action: {
              type: "create_task",
              confidence: 0.9,
              reason: "explicit task",
              payload: { title: "Drill teep setups" },
            },
          },
          {
            destination: "unassigned",
            originalText: "Random aside",
            topic: "Aside",
            projectId: null,
            projectName: null,
            confidence: 0.2,
            reason: "not actionable",
          },
        ],
      },
      reviewSnapshot: null,
    });

    expect(item).toMatchObject({
      id: "session-1",
      status: "review",
      suggestions: [
        {
          id: "plan-0",
          title: "Drill teep setups",
          objectType: "task",
          decision: "pending",
        },
      ],
    });
  });

  it("prefers accepted/rejected outcomes from the review snapshot", () => {
    const item = mapSessionToHistoryItem({
      id: "session-2",
      content: "Met with Amy.",
      status: "completed",
      createdAt: "2026-08-18T12:00:00.000Z",
      updatedAt: "2026-08-18T12:10:00.000Z",
      completedAt: "2026-08-18T12:10:00.000Z",
      analyzeResponse: { actionPlans: [] },
      reviewSnapshot: {
        operations: [
          {
            operationId: "op-note",
            title: "Meeting update",
            objectType: "note",
            selected: true,
            outcome: "accepted",
          },
          {
            operationId: "op-task",
            title: "Follow up",
            objectType: "task",
            selected: false,
            outcome: "rejected",
          },
        ],
        applied: [],
        failed: [],
        appliedAt: "2026-08-18T12:10:00.000Z",
      },
    });

    expect(item?.suggestions).toEqual([
      {
        id: "op-note",
        title: "Meeting update",
        objectType: "note",
        decision: "accepted",
      },
      {
        id: "op-task",
        title: "Follow up",
        objectType: "task",
        decision: "rejected",
      },
    ]);
  });
});

describe("buildReviewSnapshot", () => {
  it("marks ignored and unselected operations as rejected", () => {
    const snapshot = buildReviewSnapshot({
      operations: [
        {
          operationId: "op-1",
          title: "Create task",
          objectType: "task",
          selected: true,
        },
        {
          operationId: "op-2",
          title: "Skip this",
          objectType: "note",
          selected: false,
        },
        {
          operationId: "op-3",
          title: "Ignored duplicate",
          objectType: "task",
          selected: true,
          ignored: true,
        },
      ],
      applied: [
        {
          id: "task-1",
          type: "task",
          title: "Create task",
          action: "created",
          href: "/tasks/task-1",
        },
      ],
      failed: [],
      appliedAt: "2026-08-18T12:10:00.000Z",
    });

    expect(snapshot.operations.map((op) => op.outcome)).toEqual([
      "accepted",
      "rejected",
      "rejected",
    ]);
  });
});
