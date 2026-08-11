import { PROJECT_EMBEDDING_MODEL } from "./constants.js";
import { createOpenAIClient } from "./openai-client.js";
import type { GenerateEmbeddingOptions } from "./types.js";
import { EmbeddingGenerationError } from "./errors.js";

function assertValidEmbeddingVector(vector: unknown): number[] {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new EmbeddingGenerationError(
      "OpenAI returned an empty embedding vector"
    );
  }

  const numericVector = vector.map((value, index) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new EmbeddingGenerationError(
        `OpenAI returned a malformed embedding vector at index ${index}`
      );
    }

    return value;
  });

  return numericVector;
}

export async function generateEmbedding(
  text: string,
  options: GenerateEmbeddingOptions = {}
): Promise<number[]> {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new EmbeddingGenerationError("Retrieval document text is empty");
  }

  const client = options.client ?? createOpenAIClient();
  const model = options.model ?? PROJECT_EMBEDDING_MODEL;

  try {
    const response = await client.embeddings.create({
      model,
      input: trimmedText,
    });

    const vector = response.data[0]?.embedding;
    return assertValidEmbeddingVector(vector);
  } catch (error) {
    if (error instanceof EmbeddingGenerationError) {
      throw error;
    }

    const message =
      error instanceof Error ? error.message : "Unknown OpenAI error";

    throw new EmbeddingGenerationError(
      `OpenAI embedding request failed: ${message}`,
      { cause: error }
    );
  }
}
