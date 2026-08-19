import { describe, expect, it, vi } from "vitest";
import {
  AnalyzeActiveNoteQuery,
  AnalyzeActiveNoteQueryHandler,
} from "./analyze-active-note.query.js";
import type { ActiveNoteAIProvider } from "../../../active-notes/index.js";
import type { IActiveNoteSessionRepository } from "../../../interfaces/active-note-session-repository.js";

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

describe("AnalyzeActiveNoteQueryHandler", () => {
  it("persists a session around successful analysis", async () => {
    const sessions: IActiveNoteSessionRepository = {
      beginAnalysis: vi.fn().mockResolvedValue({
        id: "session-1",
        organizationId: "org-1",
        userId: "user-1",
        status: "analyzing",
      }),
      recordStep: vi.fn().mockResolvedValue(undefined),
      completeAnalysis: vi.fn().mockResolvedValue(undefined),
      failAnalysis: vi.fn().mockResolvedValue(undefined),
      completeApply: vi.fn().mockResolvedValue(undefined),
      listHistory: vi.fn().mockResolvedValue([]),
    };
    const aiProvider = {
      analyze: vi.fn().mockImplementation(async (input) => {
        await input.recorder?.recordStep("segment", {
          segments: ANALYZE_OUTPUT.segments,
        });
        await input.recorder?.recordStep("action_plan", ANALYZE_OUTPUT);
        return ANALYZE_OUTPUT;
      }),
    } as unknown as ActiveNoteAIProvider;

    const handler = new AnalyzeActiveNoteQueryHandler(aiProvider, sessions);
    const result = await handler.execute(
      new AnalyzeActiveNoteQuery("user-1", "org-1", {
        content: "  Throw more teeps  ",
      })
    );

    expect(result).toEqual({ ...ANALYZE_OUTPUT, sessionId: "session-1" });
    expect(sessions.beginAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        userId: "user-1",
        content: "Throw more teeps",
      })
    );
    expect(sessions.recordStep).toHaveBeenCalledWith({
      sessionId: "session-1",
      step: "segment",
      payload: { segments: ANALYZE_OUTPUT.segments },
    });
    expect(sessions.completeAnalysis).toHaveBeenCalledWith({
      sessionId: "session-1",
      analyzeResponse: ANALYZE_OUTPUT,
    });
    expect(sessions.failAnalysis).not.toHaveBeenCalled();
  });

  it("still returns analysis when session begin fails", async () => {
    const sessions: IActiveNoteSessionRepository = {
      beginAnalysis: vi.fn().mockRejectedValue(new Error("db down")),
      recordStep: vi.fn(),
      completeAnalysis: vi.fn(),
      failAnalysis: vi.fn(),
      completeApply: vi.fn(),
      listHistory: vi.fn(),
    };
    const aiProvider = {
      analyze: vi.fn().mockResolvedValue(ANALYZE_OUTPUT),
    } as unknown as ActiveNoteAIProvider;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const handler = new AnalyzeActiveNoteQueryHandler(aiProvider, sessions);
    const result = await handler.execute(
      new AnalyzeActiveNoteQuery("user-1", "org-1", {
        content: "Throw more teeps",
      })
    );

    expect(result).toEqual({ ...ANALYZE_OUTPUT, sessionId: null });
    expect(sessions.recordStep).not.toHaveBeenCalled();
    expect(sessions.completeAnalysis).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
