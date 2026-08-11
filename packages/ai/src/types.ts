import type OpenAI from "openai";

export interface GenerateEmbeddingOptions {
  client?: OpenAI;
  model?: string;
}
