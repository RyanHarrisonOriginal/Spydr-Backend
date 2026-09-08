import { describe, expect, it } from "vitest";
import { toActiveNoteAnalysisSnapshot } from "./to-analysis-snapshot.js";
import type { ActiveNoteAnalysisRecord } from "./active-note-session-repository.js";

const analyzeResponse = {
  segments: [
    {
      topic: "Practice",
      sourceText: "Throw more teeps",
      contextualText: "Throw more teeps",
    },
  ],
  actionPlans: [],
};

const reviewSnapshot = {
  operations: [
    {
      operationId: "op-0",
      title: "Drill teeps",
      objectType: "task",
      selected: true,
      outcome: "accepted" as const,
    },
  ],
  applied: [
    {
      id: "task-1",
      type: "task" as const,
      title: "Drill teeps",
      action: "created" as const,
      href: "/tasks/task-1",
      operationId: "op-0",
    },
  ],
  failed: [],
  appliedAt: "2026-09-04T12:00:00.000Z",
};

function record(
  overrides: Partial<ActiveNoteAnalysisRecord> = {}
): ActiveNoteAnalysisRecord {
  return {
    id: "session-1",
    organizationId: "org-1",
    userId: "user-1",
    status: "review",
    content: "Throw more teeps",
    projectId: null,
    analyzeResponse,
    reviewSnapshot: null,
    completedSteps: ["segment", "action_plan"],
    errorMessage: null,
    failedStep: null,
    ...overrides,
  };
}

describe("toActiveNoteAnalysisSnapshot", () => {
  it("includes analysis output after apply completes", () => {
    expect(
      toActiveNoteAnalysisSnapshot(
        record({
          status: "completed",
          reviewSnapshot,
        })
      )
    ).toMatchObject({
      sessionId: "session-1",
      status: "completed",
      segments: analyzeResponse.segments,
      actionPlans: analyzeResponse.actionPlans,
      reviewSnapshot,
    });
  });

  it("does not treat an apply failure as an analysis failure", () => {
    const snapshot = toActiveNoteAnalysisSnapshot(
      record({
        status: "failed",
        reviewSnapshot: {
          ...reviewSnapshot,
          operations: [
            {
              ...reviewSnapshot.operations[0],
              outcome: "failed",
            },
          ],
          applied: [],
          failed: [{ operationId: "op-0", message: "Project not found" }],
        },
      })
    );

    expect(snapshot.actionPlans).toEqual(analyzeResponse.actionPlans);
    expect(snapshot.errorMessage).toBeNull();
  });
});
