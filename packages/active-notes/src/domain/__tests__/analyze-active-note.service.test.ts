import { describe, expect, it, vi } from "vitest";
import { AnalyzeActiveNoteService } from "../analyze-active-note.service.js";
import type { AnalyzeActiveNotePorts } from "../ports/index.js";
import type { ActiveNoteRequestContext } from "../types/index.js";

const REQUEST_CONTEXT: ActiveNoteRequestContext = {
  orgId: "org-11111111-1111-1111-1111-111111111111",
  userId: "user-1",
};

function createPorts(
  overrides: Partial<AnalyzeActiveNotePorts> = {}
): AnalyzeActiveNotePorts {
  return {
    embedding: {
      embed: vi.fn().mockResolvedValue([0.11, 0.22]),
    },
    projectSearch: {
      search: vi.fn().mockResolvedValue([]),
    },
    projectActionContext: {
      get: vi.fn().mockResolvedValue({
        project: {
          id: "project-1",
          title: "Launch Planning",
        },
        openTasks: [],
        recentTasks: [],
        recentNotes: [],
        recentDecisions: [],
        recentIdeas: [],
      }),
    },
    segmenter: {
      segment: vi.fn(async (content: string) => ({
        segments: [
          {
            topic: "Active note",
            sourceText: content,
            contextualText: content,
          },
        ],
      })),
    },
    projectAssignment: {
      evaluateFit: vi.fn(),
      resolveMatch: vi.fn(),
      classifyUnassigned: vi.fn(async (segment) => ({
        originalText: segment.sourceText,
        destination: "existing_project" as const,
        projectId: "project-1",
        projectName: "Launch Planning",
        matchBasis: "project_scope" as const,
        confidence: 0.9,
        reason: "Test assignment.",
      })),
    },
    actionPlanner: {
      plan: vi.fn(async (input) => ({
        originalText: input.routedSegment.originalText,
        projectId: input.routedSegment.projectId,
        projectName: input.routedSegment.projectName,
        intent: "project_context",
        action: {
          type: "create_note",
          confidence: 0.8,
          reason: "Test provider preserved the segment as Project context.",
          payload: {
            subject: "Project Update",
            content: input.routedSegment.originalText,
          },
        },
      })),
    },
    ...overrides,
  };
}

describe("AnalyzeActiveNoteService", () => {
  it("embeds segments after segmentation and before project search", async () => {
    const ports = createPorts();
    const service = new AnalyzeActiveNoteService(ports);

    await service.analyze({
      content: "Plan the launch",
      ...REQUEST_CONTEXT,
    });

    expect(ports.embedding.embed).toHaveBeenCalledWith("Plan the launch");
    expect(ports.projectSearch.search).toHaveBeenCalledWith(
      REQUEST_CONTEXT.orgId,
      [0.11, 0.22],
      5
    );
  });

  it("does not expose embedding vectors in the public analyze response", async () => {
    const service = new AnalyzeActiveNoteService(createPorts());

    const result = await service.analyze({
      content: "Plan the launch",
      ...REQUEST_CONTEXT,
    });

    expect(result).toEqual({
      segments: [
        {
          topic: "Active note",
          sourceText: "Plan the launch",
          contextualText: "Plan the launch",
        },
      ],
      actionPlans: [
        expect.objectContaining({
          originalText: "Plan the launch",
          contextualText: "Plan the launch",
          intent: "project_context",
          action: expect.objectContaining({ type: "create_note" }),
        }),
      ],
    });
    expect(result.segments[0]).not.toHaveProperty("embedding");
  });

  it("records pipeline step payloads when a recorder is provided", async () => {
    const recorder = {
      recordStep: vi.fn().mockResolvedValue(undefined),
      recordFailure: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AnalyzeActiveNoteService(createPorts());

    await service.analyze({
      content: "Plan the launch",
      ...REQUEST_CONTEXT,
      recorder,
    });

    expect(recorder.recordFailure).not.toHaveBeenCalled();
    expect(recorder.recordStep.mock.calls.map((call) => call[0])).toEqual([
      "segment",
      "project_context",
      "project_assignment",
      "action_plan",
    ]);
  });

  it("records the failed step when analysis throws", async () => {
    const recorder = {
      recordStep: vi.fn().mockResolvedValue(undefined),
      recordFailure: vi.fn().mockResolvedValue(undefined),
    };
    const service = new AnalyzeActiveNoteService(
      createPorts({
        embedding: {
          embed: vi.fn().mockRejectedValue(new Error("rate limit exceeded")),
        },
      })
    );

    await expect(
      service.analyze({
        content: "Plan the launch",
        ...REQUEST_CONTEXT,
        recorder,
      })
    ).rejects.toMatchObject({
      name: "ActiveNoteAnalysisError",
    });

    expect(recorder.recordStep).toHaveBeenCalledWith("segment", expect.any(Object));
    expect(recorder.recordFailure).toHaveBeenCalledWith(
      "embed",
      expect.objectContaining({ message: expect.any(String) })
    );
  });

  it("wraps embedding failures as ActiveNoteAnalysisError", async () => {
    const service = new AnalyzeActiveNoteService(
      createPorts({
        embedding: {
          embed: vi.fn().mockRejectedValue(new Error("rate limit exceeded")),
        },
      })
    );

    await expect(
      service.analyze({
        content: "Plan the launch",
        ...REQUEST_CONTEXT,
      })
    ).rejects.toMatchObject({
      name: "ActiveNoteAnalysisError",
      message: "Active note analysis failed. Please try again.",
    });
  });
});
