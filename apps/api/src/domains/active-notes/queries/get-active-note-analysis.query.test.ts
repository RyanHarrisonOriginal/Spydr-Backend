import { describe, expect, it, vi } from "vitest";
import {
  GetActiveNoteAnalysisQuery,
  GetActiveNoteAnalysisQueryHandler,
} from "./get-active-note-analysis.query.js";
import { ActiveNoteAnalysisError } from "@spydr/active-notes";
import type { IActiveNoteSessionRepository } from "@spydr/active-notes";

describe("GetActiveNoteAnalysisQueryHandler", () => {
  it("returns a snapshot for the current user's session", async () => {
    const sessions: IActiveNoteSessionRepository = {
      beginAnalysis: vi.fn(),
      getById: vi.fn(),
      getForUser: vi.fn().mockResolvedValue({
        id: "session-1",
        organizationId: "org-1",
        userId: "user-1",
        status: "review",
        content: "Throw more teeps",
        projectId: null,
        analyzeResponse: {
          segments: [
            {
              topic: "Practice",
              sourceText: "Throw more teeps",
              contextualText: "Throw more teeps",
            },
          ],
          actionPlans: [],
        },
        completedSteps: ["segment", "action_plan"],
        errorMessage: null,
        failedStep: null,
        reviewSnapshot: null,
      }),
      recordStep: vi.fn(),
      completeAnalysis: vi.fn(),
      failAnalysis: vi.fn(),
      completeApply: vi.fn(),
      listHistory: vi.fn(),
    };

    const handler = new GetActiveNoteAnalysisQueryHandler(sessions);
    const result = await handler.execute(
      new GetActiveNoteAnalysisQuery("user-1", "org-1", "session-1")
    );

    expect(result).toMatchObject({
      sessionId: "session-1",
      status: "review",
      content: "Throw more teeps",
      segments: [{ topic: "Practice" }],
    });
  });

  it("returns analysis and review snapshot for a completed session", async () => {
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
    const sessions: IActiveNoteSessionRepository = {
      beginAnalysis: vi.fn(),
      getById: vi.fn(),
      getForUser: vi.fn().mockResolvedValue({
        id: "session-1",
        organizationId: "org-1",
        userId: "user-1",
        status: "completed",
        content: "Throw more teeps",
        projectId: null,
        analyzeResponse: {
          segments: [
            {
              topic: "Practice",
              sourceText: "Throw more teeps",
              contextualText: "Throw more teeps",
            },
          ],
          actionPlans: [],
        },
        reviewSnapshot,
        completedSteps: ["segment", "action_plan"],
        errorMessage: null,
        failedStep: null,
      }),
      recordStep: vi.fn(),
      completeAnalysis: vi.fn(),
      failAnalysis: vi.fn(),
      completeApply: vi.fn(),
      listHistory: vi.fn(),
    };

    const handler = new GetActiveNoteAnalysisQueryHandler(sessions);
    const result = await handler.execute(
      new GetActiveNoteAnalysisQuery("user-1", "org-1", "session-1")
    );

    expect(result).toMatchObject({
      sessionId: "session-1",
      status: "completed",
      segments: [{ topic: "Practice" }],
      reviewSnapshot,
    });
  });

  it("throws 404 when the session is missing", async () => {
    const sessions: IActiveNoteSessionRepository = {
      beginAnalysis: vi.fn(),
      getById: vi.fn(),
      getForUser: vi.fn().mockResolvedValue(null),
      recordStep: vi.fn(),
      completeAnalysis: vi.fn(),
      failAnalysis: vi.fn(),
      completeApply: vi.fn(),
      listHistory: vi.fn(),
    };

    const handler = new GetActiveNoteAnalysisQueryHandler(sessions);

    await expect(
      handler.execute(
        new GetActiveNoteAnalysisQuery("user-1", "org-1", "missing")
      )
    ).rejects.toBeInstanceOf(ActiveNoteAnalysisError);
  });
});
