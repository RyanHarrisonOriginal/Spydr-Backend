import type {
  IActiveNoteSegmenter,
  ActiveNoteSegmentationResult,
} from "../../../../domain/active-notes/index.js";
import { ACTIVE_NOTE_SEGMENTATION_RESPONSE_SCHEMA } from "./json-schema.js";
import {
  ACTIVE_NOTE_PROMPT_VERSION,
  ACTIVE_NOTE_SEGMENTATION_SYSTEM_PROMPT,
} from "./prompt.js";
import { parseActiveNoteSegmentationOutput } from "./parse.js";
import type { OpenAIJsonClient } from "../openai-json-client.js";

export class OpenAIActiveNoteSegmenter implements IActiveNoteSegmenter {
  constructor(private readonly client: OpenAIJsonClient) {}

  async segment(content: string): Promise<ActiveNoteSegmentationResult> {
    return this.client.runAnalysisStep(
      ACTIVE_NOTE_PROMPT_VERSION,
      "segmentation",
      async () => {
        const parsedJson = await this.client.runJsonSchemaPrompt({
          systemPrompt: ACTIVE_NOTE_SEGMENTATION_SYSTEM_PROMPT,
          userContent: content,
          jsonSchema: ACTIVE_NOTE_SEGMENTATION_RESPONSE_SCHEMA,
        });
        return parseActiveNoteSegmentationOutput(parsedJson);
      }
    );
  }
}
