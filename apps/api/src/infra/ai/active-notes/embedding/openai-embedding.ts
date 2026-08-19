import { generateEmbedding } from "@spydr/ai";
import type { IEmbeddingPort } from "../../../../domain/active-notes/index.js";
import type OpenAI from "openai";

export class OpenAIEmbeddingAdapter implements IEmbeddingPort {
  constructor(private readonly client?: OpenAI) {}

  embed(text: string): Promise<number[]> {
    return generateEmbedding(text, this.client ? { client: this.client } : undefined);
  }
}
