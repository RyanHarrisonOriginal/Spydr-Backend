import type { ActiveNoteReviewSnapshot, ActiveNoteHistoryDecision } from "../types/index.js";

export function buildReviewSnapshot(input: {
  operations: Array<{
    operationId: string;
    title: string;
    objectType: string | null;
    selected: boolean;
    ignored?: boolean;
  }>;
  applied: ActiveNoteReviewSnapshot["applied"];
  failed: ActiveNoteReviewSnapshot["failed"];
  appliedAt: string;
}): ActiveNoteReviewSnapshot {
  const failedIds = new Set(input.failed.map((item) => item.operationId));

  return {
    operations: input.operations.map((operation) => {
      const rejected = !operation.selected || Boolean(operation.ignored);
      const outcome: Exclude<ActiveNoteHistoryDecision, "pending"> = rejected
        ? "rejected"
        : failedIds.has(operation.operationId)
          ? "failed"
          : "accepted";

      return {
        operationId: operation.operationId,
        title: operation.title,
        objectType: operation.objectType,
        selected: operation.selected && !operation.ignored,
        outcome,
      };
    }),
    applied: input.applied,
    failed: input.failed,
    appliedAt: input.appliedAt,
  };
}
