import type { AppliedActiveNoteObject } from "../types/apply.js";
import type { ActiveNoteReviewSnapshot } from "../types/history.js";

function indexAppliedByOperationId(
  snapshot: ActiveNoteReviewSnapshot
): Map<string, AppliedActiveNoteObject> {
  const byId = new Map<string, AppliedActiveNoteObject>();
  const acceptedIds = snapshot.operations
    .filter((operation) => operation.outcome === "accepted")
    .map((operation) => operation.operationId);

  let unpairedIndex = 0;
  for (const item of snapshot.applied) {
    const operationId =
      item.operationId?.trim() || acceptedIds[unpairedIndex++] || null;
    if (!operationId || byId.has(operationId)) continue;
    byId.set(operationId, { ...item, operationId });
  }

  return byId;
}

export function mergeReviewSnapshot(
  previous: ActiveNoteReviewSnapshot | null | undefined,
  current: ActiveNoteReviewSnapshot
): ActiveNoteReviewSnapshot {
  if (!previous) return current;

  const previousById = new Map(
    previous.operations.map((operation) => [operation.operationId, operation])
  );
  const currentById = new Map(
    current.operations.map((operation) => [operation.operationId, operation])
  );
  const previousApplied = indexAppliedByOperationId(previous);
  const currentApplied = indexAppliedByOperationId(current);

  const operationIds = [
    ...new Set([...previousById.keys(), ...currentById.keys()]),
  ];

  const operations = operationIds.map((operationId) => {
    const previousOperation = previousById.get(operationId);
    const currentOperation = currentById.get(operationId);
    if (!currentOperation) return previousOperation!;
    if (
      currentOperation.outcome === "rejected" &&
      !currentOperation.selected &&
      previousOperation?.outcome === "accepted"
    ) {
      return previousOperation;
    }
    return currentOperation;
  });

  const applied = operations.flatMap((operation) => {
    if (operation.outcome !== "accepted") return [];
    const latest = currentApplied.get(operation.operationId);
    if (latest) return [latest];
    const prior = previousApplied.get(operation.operationId);
    return prior ? [prior] : [];
  });

  const failedById = new Map<string, ActiveNoteReviewSnapshot["failed"][number]>();
  for (const item of previous.failed) {
    failedById.set(item.operationId, item);
  }
  for (const item of current.failed) {
    failedById.set(item.operationId, item);
  }
  for (const operation of operations) {
    if (operation.outcome !== "failed") {
      failedById.delete(operation.operationId);
    }
  }

  return {
    operations,
    applied,
    failed: [...failedById.values()],
    appliedAt: current.appliedAt,
  };
}
