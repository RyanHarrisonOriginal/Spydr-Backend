import type {
  ActiveNoteAIInput,
  ActiveNoteAIOutput,
  ActiveNoteAIProvider,
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

  async analyze(input: ActiveNoteAIInput): Promise<ActiveNoteAIOutput> {
    return this.provider.analyze(input);
  }

  private resolveProvider(): {
    provider: ActiveNoteAIProvider;
    name: "openai" | "stub";
  } {
    if (process.env.OPENAI_API_KEY?.trim()) {
      try {
        const provider = createActiveNoteAIProvider();
        const model =
          process.env.OPENAI_ACTIVE_NOTE_MODEL?.trim() || "gpt-4o-mini";
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
