import { describe, expect, it, vi } from "vitest";
import {
  AnalyzeActiveNoteQuery,
  AnalyzeActiveNoteQueryHandler,
} from "./analyze-active-note.query.js";
import type { IActiveNoteSessionRepository } from "@spydr/active-notes";

function createSessions(
  overrides: Partial<IActiveNoteSessionRepository> = {}
): IActiveNoteSessionRepository {
  return {
    beginAnalysis: vi.fn().mockResolvedValue({
      id: "session-1",
      organizationId: "org-1",
      userId: "user-1",
      status: "analyzing",
    }),
    getById: vi.fn(),
    getForUser: vi.fn(),
    recordStep: vi.fn(),
    completeAnalysis: vi.fn(),
    failAnalysis: vi.fn().mockResolvedValue(undefined),
    completeApply: vi.fn(),
    listHistory: vi.fn(),
    ...overrides,
  };
}

describe("AnalyzeActiveNoteQueryHandler", () => {
  it("creates a session and enqueues analysis", async () => {
    const sessions = createSessions();
    const enqueue = vi.fn().mockResolvedValue(undefined);
    const handler = new AnalyzeActiveNoteQueryHandler(
      sessions,
      enqueue,
      "active-note-segmentation-v1"
    );

    const result = await handler.execute(
      new AnalyzeActiveNoteQuery("user-1", "org-1", {
        content: "  Throw more teeps  ",
      })
    );

    expect(result).toEqual({ sessionId: "session-1", status: "analyzing" });
    expect(sessions.beginAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        content: "Throw more teeps",
        promptVersion: "active-note-segmentation-v1",
      })
    );
    expect(enqueue).toHaveBeenCalledWith("session-1");
    expect(sessions.failAnalysis).not.toHaveBeenCalled();
  });

  it("marks the session failed when enqueue fails", async () => {
    const sessions = createSessions();
    const enqueue = vi.fn().mockRejectedValue(new Error("redis down"));
    const handler = new AnalyzeActiveNoteQueryHandler(sessions, enqueue);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      handler.execute(
        new AnalyzeActiveNoteQuery("user-1", "org-1", {
          content: "Throw more teeps",
        })
      )
    ).rejects.toMatchObject({ statusCode: 500 });

    expect(sessions.failAnalysis).toHaveBeenCalledWith({
      sessionId: "session-1",
      failedStep: "enqueue",
      errorMessage: "redis down",
    });
    errorSpy.mockRestore();
  });
});
