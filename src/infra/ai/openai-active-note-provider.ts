import OpenAI from "openai";
import {
  ACTIVE_NOTE_PROMPT_VERSION,
  ActiveNoteAnalysisError,
  buildActiveNoteUserPrompt,
  ACTIVE_NOTE_SYSTEM_PROMPT,
  parseActiveNoteAIOutput,
  type ActiveNoteAIInput,
  type ActiveNoteAIOutput,
  type ActiveNoteAIProvider,
} from "../../domain/active-notes/index.js";
import { stripNullPayloadFields } from "./active-note-helpers.js";
import { ACTIVE_NOTE_RESPONSE_SCHEMA } from "./active-note-response-schema.js";

export interface OpenAIActiveNoteProviderOptions {
  apiKey?: string;
  model?: string;
  client?: OpenAI;
}

export class OpenAIActiveNoteProvider implements ActiveNoteAIProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIActiveNoteProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!options.client && !apiKey) {
      throw new ActiveNoteAnalysisError(
        "OPENAI_API_KEY is not configured",
        500
      );
    }

    this.client =
      options.client ??
      new OpenAI({
        apiKey,
      });
    this.model =
      options.model ??
      process.env.OPENAI_ACTIVE_NOTE_MODEL ??
      "gpt-4o-mini";
  }

  async analyze(input: ActiveNoteAIInput): Promise<ActiveNoteAIOutput> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: ACTIVE_NOTE_RESPONSE_SCHEMA,
        },
        messages: [
          {
            role: "system",
            content: ACTIVE_NOTE_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: buildActiveNoteUserPrompt({
              content: input.content,
              selectedProject: input.selectedProject,
              candidateProjects: input.candidateProjects,
              candidateProjectContexts: input.candidateProjectContexts,
            }),
          },
        ],
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new ActiveNoteAnalysisError(
          "AI provider returned an empty response"
        );
      }

      let parsedJson: unknown;
      try {
        parsedJson = JSON.parse(content);
      } catch {
        throw new ActiveNoteAnalysisError(
          "AI provider returned invalid JSON"
        );
      }

      return parseActiveNoteAIOutput(stripNullPayloadFields(parsedJson));
    } catch (error) {
      if (error instanceof ActiveNoteAnalysisError) {
        throw error;
      }

      console.error(
        `[${ACTIVE_NOTE_PROMPT_VERSION}] Active note analysis provider failure`,
        error
      );
      throw new ActiveNoteAnalysisError(
        "Active note analysis failed. Please try again."
      );
    }
  }
}

export function createActiveNoteAIProvider(): ActiveNoteAIProvider {
  return new OpenAIActiveNoteProvider();
}
