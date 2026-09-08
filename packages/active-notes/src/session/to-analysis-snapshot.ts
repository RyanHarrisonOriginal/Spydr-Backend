import type { ActiveNoteAnalysisSnapshot } from "../domain/index.js";
import type { ActiveNoteAnalysisRecord } from "./active-note-session-repository.js";

export function toActiveNoteAnalysisSnapshot(
  record: ActiveNoteAnalysisRecord
): ActiveNoteAnalysisSnapshot {
  const snapshot: ActiveNoteAnalysisSnapshot = {
    sessionId: record.id,
    status: record.status === "draft" ? "analyzing" : record.status,
    content: record.content,
    projectId: record.projectId,
    completedSteps: record.completedSteps,
  };

  if (record.analyzeResponse) {
    snapshot.segments = record.analyzeResponse.segments;
    snapshot.actionPlans = record.analyzeResponse.actionPlans;
  }

  if (record.reviewSnapshot) {
    snapshot.reviewSnapshot = record.reviewSnapshot;
  }

  if (record.status === "failed") {
    snapshot.failedStep = record.failedStep;
    snapshot.errorMessage =
      record.errorMessage ??
      (record.analyzeResponse
        ? null
        : "Active note analysis failed. Please try again.");
  }

  return snapshot;
}
