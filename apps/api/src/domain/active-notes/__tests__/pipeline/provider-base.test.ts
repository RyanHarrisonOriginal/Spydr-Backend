import { describe, expect, it, vi } from "vitest";
import {
  ActiveNoteAIProviderBase,
  activeNoteAIOutputSchema,
  type ActiveNoteAIInput,
  type ActiveNoteEmbeddedSegmentationResult,
  type ActiveNoteProjectAssignmentResult,
  type ActiveNoteProjectContextResult,
  type ActiveNoteRequestContext,
  type ActiveNoteSegmentationResult,
  type PlanSegmentActionInput,
  type SegmentActionPlan,
} from "../../index.js";

const REQUEST_CONTEXT: ActiveNoteRequestContext = {
  orgId: "org-11111111-1111-1111-1111-111111111111",
  userId: "user-1",
};

class TestActiveNoteProvider extends ActiveNoteAIProviderBase {
  readonly segmentImpl: (
    input: ActiveNoteAIInput
  ) => Promise<ActiveNoteSegmentationResult>;
  readonly getProjectContextImpl?: (
    result: ActiveNoteEmbeddedSegmentationResult,
    context: ActiveNoteRequestContext
  ) => Promise<ActiveNoteProjectContextResult>;

  constructor(
    generateEmbedding: (text: string) => Promise<number[]>,
    options: {
      segmentImpl?: (
        input: ActiveNoteAIInput
      ) => Promise<ActiveNoteSegmentationResult>;
      getProjectContextImpl?: (
        result: ActiveNoteEmbeddedSegmentationResult,
        context: ActiveNoteRequestContext
      ) => Promise<ActiveNoteProjectContextResult>;
      searchProjectsByEmbedding?: ReturnType<typeof vi.fn>;
    } = {}
  ) {
    super({
      generateEmbedding,
      searchProjectsByEmbedding: options.searchProjectsByEmbedding,
      createProjectActionContextService: () =>
        ({
          getProjectActionContext: vi.fn().mockResolvedValue({
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
        }) as never,
    });
    this.segmentImpl =
      options.segmentImpl ??
      vi.fn(async (input: ActiveNoteAIInput) => ({
        segments: [
          {
            topic: "Active note",
            sourceText: input.content,
            contextualText: input.content,
          },
        ],
      }));
    this.getProjectContextImpl = options.getProjectContextImpl;
  }

  segment(input: ActiveNoteAIInput): Promise<ActiveNoteSegmentationResult> {
    return this.segmentImpl(input);
  }

  inferProjectAssignment(
    result: ActiveNoteProjectContextResult
  ): Promise<ActiveNoteProjectAssignmentResult> {
    return Promise.resolve({
      embeddedSegments: result.embeddedSegments.map((segment) => ({
        ...segment,
        projectAssignment: {
          originalText: segment.sourceText,
          destination: "existing_project" as const,
          projectId: "project-1",
          projectName: "Launch Planning",
          matchBasis: "project_scope" as const,
          confidence: 0.9,
          reason: "Test assignment.",
        },
      })),
    });
  }

  planSegmentAction(input: PlanSegmentActionInput): Promise<SegmentActionPlan> {
    return Promise.resolve({
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
    });
  }

  override async getProjectContext(
    result: ActiveNoteEmbeddedSegmentationResult,
    context: ActiveNoteRequestContext
  ): Promise<ActiveNoteProjectContextResult> {
    if (this.getProjectContextImpl) {
      return this.getProjectContextImpl(result, context);
    }

    return super.getProjectContext(result, context);
  }
}

describe("ActiveNoteAIProviderBase", () => {
  it("embeds segments after segmentation and before project context", async () => {
    const generateEmbedding = vi.fn().mockResolvedValue([0.11, 0.22]);
    const getProjectContextImpl = vi.fn(async (result) => ({
      embeddedSegments: result.embeddedSegments.map((segment) => ({
        ...segment,
        projectMatches: [],
      })),
    }));
    const provider = new TestActiveNoteProvider(generateEmbedding, {
      searchProjectsByEmbedding: vi.fn().mockResolvedValue([]),
      getProjectContextImpl,
    });

    await provider.analyze({
      content: "Plan the launch",
      ...REQUEST_CONTEXT,
    });

    expect(generateEmbedding).toHaveBeenCalledWith("Plan the launch");
    expect(getProjectContextImpl).toHaveBeenCalledWith(
      {
        embeddedSegments: [
          expect.objectContaining({
            topic: "Active note",
            contextualText: "Plan the launch",
            embedding: [0.11, 0.22],
          }),
        ],
      },
      REQUEST_CONTEXT
    );
  });

  it("does not expose embedding vectors in the public analyze response", async () => {
    const provider = new TestActiveNoteProvider(
      vi.fn().mockResolvedValue(Array.from({ length: 1536 }, () => 0.5)),
      {
        searchProjectsByEmbedding: vi.fn().mockResolvedValue([]),
      }
    );

    const result = await provider.analyze({
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
    expect(activeNoteAIOutputSchema.safeParse(result).success).toBe(true);
  });

  it("wraps embedding failures as ActiveNoteAnalysisError", async () => {
    const provider = new TestActiveNoteProvider(
      vi.fn().mockRejectedValue(new Error("rate limit exceeded"))
    );

    await expect(
      provider.analyze({
        content: "Plan the launch",
        ...REQUEST_CONTEXT,
      })
    ).rejects.toMatchObject({
      name: "ActiveNoteAnalysisError",
      message: "Active note analysis failed. Please try again.",
    });
  });
});
