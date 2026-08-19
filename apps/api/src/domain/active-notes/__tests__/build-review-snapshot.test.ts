import { describe, expect, it } from "vitest";
import { buildReviewSnapshot } from "../history/build-review-snapshot.js";

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
