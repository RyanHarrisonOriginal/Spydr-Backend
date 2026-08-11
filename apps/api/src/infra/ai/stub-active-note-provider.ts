import {
  ActiveNoteAIProviderBase,
  inferStubProjectAssignments,
  inferStubSegmentActionPlan,
  type ActiveNoteAIInput,
  type ActiveNoteProjectAssignmentResult,
  type ActiveNoteProjectContextResult,
  type ActiveNoteSegmentationResult,
  type PlanSegmentActionInput,
  type SegmentActionPlan,
} from "../../domain/active-notes/index.js";

const STUB_EMBEDDING = Array.from({ length: 1536 }, (_, index) => (index + 1) / 1536);

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildStubActiveNoteSegmentationOutput(
  input: ActiveNoteAIInput
): ActiveNoteSegmentationResult {
  const trimmed = input.content.trim();
  return {
    segments: [
      {
        topic: "Active note",
        sourceText: trimmed,
        contextualText: trimmed,
      },
    ],
  };
}

export class StubActiveNoteAIProvider extends ActiveNoteAIProviderBase {
  constructor() {
    super({
      generateEmbedding: async () => [...STUB_EMBEDDING],
    });
  }

  async segment(input: ActiveNoteAIInput): Promise<ActiveNoteSegmentationResult> {
    await delay();
    return buildStubActiveNoteSegmentationOutput(input);
  }

  async inferProjectAssignment(
    result: ActiveNoteProjectContextResult
  ): Promise<ActiveNoteProjectAssignmentResult> {
    await delay();
    return {
      embeddedSegments: await inferStubProjectAssignments(result.embeddedSegments),
    };
  }

  async planSegmentAction(
    input: PlanSegmentActionInput
  ): Promise<SegmentActionPlan> {
    await delay();
    return inferStubSegmentActionPlan(
      input.routedSegment,
      input.projectContext
    );
  }
}
