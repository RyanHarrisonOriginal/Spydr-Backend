import type {
  ActiveNoteHistoryDecision,
  ActiveNoteHistoryItem,
  ActiveNoteHistorySuggestion,
  ActiveNoteReviewSnapshot,
} from "../domain/index.js";

type HistoryStatus = ActiveNoteHistoryItem["status"];

export interface ActiveNoteSessionHistoryRecord {
  id: string;
  content: string;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  completedAt: Date | string | null;
  analyzeResponse: unknown;
  reviewSnapshot: unknown;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function historyStatus(status: string): HistoryStatus | null {
  if (
    status === "review" ||
    status === "applying" ||
    status === "completed" ||
    status === "failed"
  ) {
    return status;
  }
  return null;
}

function suggestionFromActionPlan(
  plan: unknown,
  index: number
): ActiveNoteHistorySuggestion | null {
  const record = asRecord(plan);
  if (!record) return null;

  if (record.destination === "unassigned") {
    return null;
  }

  if (record.destination === "new_project_candidate") {
    return {
      id: `op-${index}`,
      title: asString(record.projectName) ?? asString(record.topic) ?? "New project",
      objectType: "project",
      decision: "pending",
    };
  }

  const action = asRecord(record.action);
  const payload = asRecord(action?.payload);
  const actionType = asString(action?.type);

  if (actionType === "create_task") {
    return {
      id: `op-${index}`,
      title: asString(payload?.title) ?? asString(record.topic) ?? "Task",
      objectType: "task",
      decision: "pending",
    };
  }

  if (actionType === "create_note" || actionType === "attach_note_to_task") {
    return {
      id: `op-${index}`,
      title:
        asString(payload?.subject) ??
        asString(payload?.title) ??
        asString(record.topic) ??
        "Note",
      objectType: "note",
      decision: "pending",
    };
  }

  if (actionType === "create_decision") {
    return {
      id: `op-${index}`,
      title: asString(payload?.title) ?? asString(record.topic) ?? "Decision",
      objectType: "decision",
      decision: "pending",
    };
  }

  if (actionType === "create_idea") {
    return {
      id: `op-${index}`,
      title: asString(payload?.title) ?? asString(record.topic) ?? "Idea",
      objectType: "idea",
      decision: "pending",
    };
  }

  if (actionType === "use_existing_task") {
    return {
      id: `op-${index}`,
      title:
        asString(action?.targetTaskTitle) ??
        asString(record.topic) ??
        "Existing task",
      objectType: "task",
      decision: "pending",
    };
  }

  return {
    id: `op-${index}`,
    title: asString(record.topic) ?? asString(record.originalText) ?? "Suggestion",
    objectType: null,
    decision: "pending",
  };
}

function suggestionsFromAnalyzeResponse(
  analyzeResponse: unknown
): ActiveNoteHistorySuggestion[] {
  const record = asRecord(analyzeResponse);
  const plans = Array.isArray(record?.actionPlans) ? record.actionPlans : [];
  return plans
    .map((plan, index) => suggestionFromActionPlan(plan, index))
    .filter((item): item is ActiveNoteHistorySuggestion => item != null);
}

function isHistoryDecision(
  value: unknown
): value is Exclude<ActiveNoteHistoryDecision, "pending"> {
  return value === "accepted" || value === "rejected" || value === "failed";
}

function suggestionsFromReviewSnapshot(
  reviewSnapshot: unknown
): ActiveNoteHistorySuggestion[] | null {
  const record = asRecord(reviewSnapshot);
  const operations = Array.isArray(record?.operations) ? record.operations : null;
  if (!operations) return null;

  return operations.flatMap((operation, index) => {
    const item = asRecord(operation);
    if (!item) return [];
    const title = asString(item.title);
    if (!title) return [];
    return [
      {
        id: asString(item.operationId) ?? `op-${index}`,
        title,
        objectType: asString(item.objectType),
        decision: isHistoryDecision(item.outcome)
          ? item.outcome
          : item.selected
            ? "accepted"
            : "rejected",
      },
    ];
  });
}

export function mapSessionToHistoryItem(
  session: ActiveNoteSessionHistoryRecord
): ActiveNoteHistoryItem | null {
  const status = historyStatus(session.status);
  if (!status) return null;

  const snapshotSuggestions = suggestionsFromReviewSnapshot(
    session.reviewSnapshot
  );

  return {
    id: session.id,
    content: session.content,
    status,
    createdAt: toIso(session.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(session.updatedAt) ?? new Date(0).toISOString(),
    completedAt: toIso(session.completedAt),
    suggestions:
      snapshotSuggestions ?? suggestionsFromAnalyzeResponse(session.analyzeResponse),
  };
}

export function parseReviewSnapshot(value: unknown): ActiveNoteReviewSnapshot | null {
  const record = asRecord(value);
  if (!record || !Array.isArray(record.operations)) return null;
  return record as unknown as ActiveNoteReviewSnapshot;
}
