import OpenAI from "openai";
import { EmbeddingGenerationError } from "./errors.js";

export function createOpenAIClient(apiKey?: string): OpenAI {
  const resolvedApiKey = apiKey ?? process.env.OPENAI_API_KEY?.trim();

  if (!resolvedApiKey) {
    throw new EmbeddingGenerationError("OPENAI_API_KEY is not configured");
  }

  return new OpenAI({
    apiKey: resolvedApiKey,
  });
}
