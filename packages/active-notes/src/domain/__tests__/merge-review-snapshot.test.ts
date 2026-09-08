import { describe, expect, it } from "vitest";
import { mergeReviewSnapshot } from "../history/merge-review-snapshot.js";
import type { ActiveNoteReviewSnapshot } from "../types/history.js";

function snapshot(
  overrides: Partial<ActiveNoteReviewSnapshot>
): ActiveNoteReviewSnapshot {
  return {
    operations: [],
    applied: [],
    failed: [],
    appliedAt: "2026-09-04T12:00:00.000Z",
    ...overrides,
  };
}

describe("mergeReviewSnapshot", () => {
  it("returns the current snapshot when there is no previous apply", () => {
    const current = snapshot({
      operations: [
        {
          operationId: "op-0",
          title: "Create task",
          objectType: "task",
          selected: true,
          outcome: "accepted",
        },
      ],
      applied: [
        {
          id: "task-1",
          type: "task",
          title: "Create task",
          action: "created",
          href: "/tasks/task-1",
          operationId: "op-0",
        },
      ],
    });

    expect(mergeReviewSnapshot(null, current)).toEqual(current);
  });

  it("keeps previously applied operations when they are not selected again", () => {
    const previous = snapshot({
      operations: [
        {
          operationId: "op-0",
          title: "Create task",
          objectType: "task",
          selected: true,
          outcome: "accepted",
        },
        {
          operationId: "op-1",
          title: "Meeting note",
          objectType: "note",
          selected: false,
          outcome: "rejected",
        },
      ],
      applied: [
        {
          id: "task-1",
          type: "task",
          title: "Create task",
          action: "created",
          href: "/tasks/task-1",
          operationId: "op-0",
        },
      ],
    });
    const current = snapshot({
      appliedAt: "2026-09-04T13:00:00.000Z",
      operations: [
        {
          operationId: "op-0",
          title: "Create task",
          objectType: "task",
          selected: false,
          outcome: "rejected",
        },
        {
          operationId: "op-1",
          title: "Meeting note",
          objectType: "note",
          selected: true,
          outcome: "accepted",
        },
      ],
      applied: [
        {
          id: "note-1",
          type: "note",
          title: "Meeting note",
          action: "created",
          href: "/notes/note-1",
          operationId: "op-1",
        },
      ],
    });

    const merged = mergeReviewSnapshot(previous, current);

    expect(merged.operations.map((operation) => operation.outcome)).toEqual([
      "accepted",
      "accepted",
    ]);
    expect(merged.applied.map((item) => item.id)).toEqual(["task-1", "note-1"]);
    expect(merged.appliedAt).toBe("2026-09-04T13:00:00.000Z");
  });

  it("replaces a previously applied object when the same operation is applied again", () => {
    const previous = snapshot({
      operations: [
        {
          operationId: "op-0",
          title: "Create task",
          objectType: "task",
          selected: true,
          outcome: "accepted",
        },
      ],
      applied: [
        {
          id: "task-1",
          type: "task",
          title: "Create task",
          action: "created",
          href: "/tasks/task-1",
          operationId: "op-0",
        },
      ],
    });
    const current = snapshot({
      operations: [
        {
          operationId: "op-0",
          title: "Create task",
          objectType: "task",
          selected: true,
          outcome: "accepted",
        },
      ],
      applied: [
        {
          id: "task-2",
          type: "task",
          title: "Create task",
          action: "created",
          href: "/tasks/task-2",
          operationId: "op-0",
        },
      ],
    });

    expect(mergeReviewSnapshot(previous, current).applied.map((item) => item.id)).toEqual([
      "task-2",
    ]);
  });
});
