import OpenAI from "openai";
import { ActiveNoteAnalysisError } from "../../../domain/active-notes/index.js";

export type StructuredResponseSchema = {
  name: string;
  strict?: boolean;
  schema: object;
};

export class OpenAIJsonClient {
  constructor(
    private readonly client: OpenAI,
    private readonly model: string
  ) {}

  async runJsonSchemaPrompt(options: {
    systemPrompt: string;
    userContent: string;
    jsonSchema: StructuredResponseSchema;
  }): Promise<unknown> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      ...(modelSupportsCustomTemperature(this.model)
        ? { temperature: 0.2 }
        : {}),
      response_format: {
        type: "json_schema",
        json_schema: {
          name: options.jsonSchema.name,
          strict: options.jsonSchema.strict,
          schema: options.jsonSchema.schema as { [key: string]: unknown },
        },
      },
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userContent },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new ActiveNoteAnalysisError(
        "AI provider returned an empty response"
      );
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new ActiveNoteAnalysisError("AI provider returned invalid JSON");
    }
  }

  async runAnalysisStep<T>(
    promptVersion: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ActiveNoteAnalysisError) {
        throw error;
      }

      console.error(
        `[${promptVersion}] Active note ${operation} provider failure`,
        error
      );
      throw new ActiveNoteAnalysisError(
        "Active note analysis failed. Please try again."
      );
    }
  }
}

function modelSupportsCustomTemperature(model: string): boolean {
  const id = model.toLowerCase();
  return !id.startsWith("gpt-5") && !/^o[1-9]/.test(id);
}
