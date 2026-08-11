import { describe, expect, it } from "vitest";
import { PROJECT_EMBEDDING_VECTOR_DIMENSIONS, EmbeddingGenerationError } from "@spydr/ai";
import { formatEmbeddingForPgvector } from "./pgvector.js";

describe("formatEmbeddingForPgvector", () => {
  it("formats a valid embedding vector for pgvector", () => {
    const embedding = Array.from({ length: PROJECT_EMBEDDING_VECTOR_DIMENSIONS }, () => 0.1);

    expect(formatEmbeddingForPgvector(embedding)).toBe(
      `[${embedding.map(() => "0.1").join(",")}]`
    );
  });

  it("rejects vectors with unexpected dimensions", () => {
    expect(() => formatEmbeddingForPgvector([0.1, 0.2])).toThrow(
      EmbeddingGenerationError
    );
    expect(() => formatEmbeddingForPgvector([0.1, 0.2])).toThrow(
      `expected ${PROJECT_EMBEDDING_VECTOR_DIMENSIONS}`
    );
  });
});
