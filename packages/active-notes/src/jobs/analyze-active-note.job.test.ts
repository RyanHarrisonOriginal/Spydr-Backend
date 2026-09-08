import { describe, expect, it, vi } from "vitest";
import { AnalyzeActiveNoteService } from "../domain/analyze-active-note.service.js";
import type { IActiveNoteSessionRepository } from "../session/active-note-session-repository.js";
import {
  ActiveNoteJobUnrecoverableError,
  runAnalyzeActiveNoteJob,
} from "./analyze-active-note.job.js";

const ANALYZE_OUTPUT = {
  segments: [
    {
      topic: "Practice",
      sourceText: "Throw more teeps",
      contextualText: "Throw more teeps",
    },
  ],
  actionPlans: [],
};

function createSessions(
  overrides: Partial<IActiveNoteSessionRepository> = {}
): IActiveNoteSessionRepository {
  return {
    beginAnalysis: vi.fn(),
    getById: vi.fn().mockResolvedValue({
      id: "session-1",
      organizationId: "org-1",
      userId: "user-1",
      status: "analyzing",
      content: "Throw more teeps",
      projectId: null,
      analyzeResponse: null,
      reviewSnapshot: null,
      completedSteps: [],
      errorMessage: null,
      failedStep: null,
    }),
    getForUser: vi.fn(),
    recordStep: vi.fn().mockResolvedValue(undefined),
    completeAnalysis: vi.fn().mockResolvedValue(undefined),
    failAnalysis: vi.fn().mockResolvedValue(undefined),
    completeApply: vi.fn(),
    listHistory: vi.fn(),
    ...overrides,
  };
}

describe("runAnalyzeActiveNoteJob", () => {
  it("runs analysis and completes the session", async () => {
    const sessions = createSessions();
    const analyzer = {
      analyze: vi.fn().mockResolvedValue(ANALYZE_OUTPUT),
    } as unknown as AnalyzeActiveNoteService;

    await runAnalyzeActiveNoteJob(
      { sessionId: "session-1" },
      {
        attemptsMade: 0,
        maxAttempts: 3,
        deps: { sessions, analyzer },
      }
    );

    expect(analyzer.analyze).toHaveBeenCalledWith(
      expect.objectContaining({
        content: "Throw more teeps",
        orgId: "org-1",
        userId: "user-1",
      })
    );
    expect(sessions.completeAnalysis).toHaveBeenCalledWith({
      sessionId: "session-1",
      analyzeResponse: ANALYZE_OUTPUT,
    });
    expect(sessions.failAnalysis).not.toHaveBeenCalled();
  });

  it("skips sessions that already finished", async () => {
    const sessions = createSessions({
      getById: vi.fn().mockResolvedValue({
        id: "session-1",
        organizationId: "org-1",
        userId: "user-1",
        status: "review",
        content: "Throw more teeps",
        projectId: null,
        analyzeResponse: ANALYZE_OUTPUT,
        reviewSnapshot: null,
        completedSteps: ["action_plan"],
        errorMessage: null,
        failedStep: null,
      }),
    });
    const analyzer = {
      analyze: vi.fn(),
    } as unknown as AnalyzeActiveNoteService;

    await runAnalyzeActiveNoteJob(
      { sessionId: "session-1" },
      {
        attemptsMade: 1,
        maxAttempts: 3,
        deps: { sessions, analyzer },
      }
    );

    expect(analyzer.analyze).not.toHaveBeenCalled();
  });

  it("persists failure only on the last attempt", async () => {
    const sessions = createSessions();
    const analyzer = {
      analyze: vi.fn().mockRejectedValue(new Error("model timeout")),
    } as unknown as AnalyzeActiveNoteService;

    await expect(
      runAnalyzeActiveNoteJob(
        { sessionId: "session-1" },
        {
          attemptsMade: 0,
          maxAttempts: 3,
          deps: { sessions, analyzer },
        }
      )
    ).rejects.toThrow("model timeout");
    expect(sessions.failAnalysis).not.toHaveBeenCalled();

    await expect(
      runAnalyzeActiveNoteJob(
        { sessionId: "session-1" },
        {
          attemptsMade: 2,
          maxAttempts: 3,
          deps: { sessions, analyzer },
        }
      )
    ).rejects.toThrow("model timeout");
    expect(sessions.failAnalysis).toHaveBeenCalledWith({
      sessionId: "session-1",
      failedStep: "analyze",
      errorMessage: "model timeout",
    });
  });

  it("throws unrecoverable when the session is missing", async () => {
    const sessions = createSessions({
      getById: vi.fn().mockResolvedValue(null),
    });
    const analyzer = {
      analyze: vi.fn(),
    } as unknown as AnalyzeActiveNoteService;

    await expect(
      runAnalyzeActiveNoteJob(
        { sessionId: "missing" },
        {
          attemptsMade: 0,
          maxAttempts: 3,
          deps: { sessions, analyzer },
        }
      )
    ).rejects.toBeInstanceOf(ActiveNoteJobUnrecoverableError);
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });
});
