import { PROJECT_EMBEDDING_VECTOR_DIMENSIONS } from "@spydr/ai";
import { EmbeddingGenerationError } from "@spydr/ai";

export function formatEmbeddingForPgvector(embedding: readonly number[]): string {
  if (embedding.length !== PROJECT_EMBEDDING_VECTOR_DIMENSIONS) {
    throw new EmbeddingGenerationError(
      `Embedding has ${embedding.length} dimensions; expected ${PROJECT_EMBEDDING_VECTOR_DIMENSIONS}`
    );
  }

  return `[${embedding.join(",")}]`;
}
