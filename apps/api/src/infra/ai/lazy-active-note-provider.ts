import type {
  ActiveNoteAIInput,
  ActiveNoteAIOutput,
  ActiveNoteAIProvider,
  ActiveNoteEmbeddedSegmentationResult,
  ActiveNoteProjectAssignmentResult,
  ActiveNoteProjectContextResult,
  ActiveNoteRequestContext,
  ActiveNoteSegmentationResult,
} from "../../domain/active-notes/index.js";
import { createActiveNoteAIProvider } from "./openai-active-note-provider.js";
import { StubActiveNoteAIProvider } from "./stub-active-note-provider.js";

/**
 * Uses OpenAI when OPENAI_API_KEY is configured; otherwise falls back to a
 * deterministic stub so the Active Note UI can be exercised locally.
 */
export class LazyActiveNoteAIProvider implements ActiveNoteAIProvider {
  private readonly provider: ActiveNoteAIProvider;
  readonly providerName: "openai" | "stub";

  constructor() {
    const resolved = this.resolveProvider();
    this.provider = resolved.provider;
    this.providerName = resolved.name;
  }

  analyze(input: ActiveNoteAIInput): Promise<ActiveNoteAIOutput> {
    return this.provider.analyze(input);
  }

  segment(input: ActiveNoteAIInput): Promise<ActiveNoteSegmentationResult> {
    return this.provider.segment(input);
  }

  getProjectContext(
    result: ActiveNoteEmbeddedSegmentationResult,
    context: ActiveNoteRequestContext
  ): Promise<ActiveNoteProjectContextResult> {
    return this.provider.getProjectContext(result, context);
  }

  inferProjectAssignment(
    result: ActiveNoteProjectContextResult
  ): Promise<ActiveNoteProjectAssignmentResult> {
    return this.provider.inferProjectAssignment(result);
  }

  inferAction(
    result: ActiveNoteProjectAssignmentResult
  ): Promise<ActiveNoteAIOutput> {
    return this.provider.inferAction(result);
  }

  planSegmentAction(
    input: import("../../domain/active-notes/index.js").PlanSegmentActionInput
  ): Promise<import("../../domain/active-notes/index.js").SegmentActionPlan> {
    return this.provider.planSegmentAction(input);
  }

  private resolveProvider(): {
    provider: ActiveNoteAIProvider;
    name: "openai" | "stub";
  } {
    if (process.env.OPENAI_API_KEY?.trim()) {
      try {
        const provider = createActiveNoteAIProvider();
        const model =
          process.env.OPENAI_ACTIVE_NOTE_MODEL?.trim() || "gpt-5-mini";
        console.log(
          `[active-note] Using OpenAI provider (model=${model}).`
        );
        return { provider, name: "openai" };
      } catch (error) {
        console.warn(
          "[active-note] OpenAI provider failed to initialize; using stub.",
          error
        );
      }
    } else {
      console.warn(
        "[active-note] OPENAI_API_KEY not set; using stub Active Note AI provider."
      );
    }

    return { provider: new StubActiveNoteAIProvider(), name: "stub" };
  }
}
