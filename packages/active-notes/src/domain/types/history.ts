import type { AppliedActiveNoteObject } from "./apply.js";

export type ActiveNoteHistoryDecision =
  | "accepted"
  | "rejected"
  | "failed"
  | "pending";

export interface ActiveNoteHistorySuggestion {
  id: string;
  title: string;
  objectType: string | null;
  decision: ActiveNoteHistoryDecision;
}

export interface ActiveNoteHistoryItem {
  id: string;
  content: string;
  status: "review" | "applying" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  suggestions: ActiveNoteHistorySuggestion[];
}

export interface ActiveNoteReviewSnapshot {
  operations: Array<{
    operationId: string;
    title: string;
    objectType: string | null;
    selected: boolean;
    outcome: Exclude<ActiveNoteHistoryDecision, "pending">;
  }>;
  applied: AppliedActiveNoteObject[];
  failed: Array<{
    operationId: string;
    message: string;
  }>;
  appliedAt: string;
}
