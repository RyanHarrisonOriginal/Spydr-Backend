import {
  ActiveNoteAnalysisError,
  type ActiveNoteSegment,
  type EmbeddedSegment,
} from "./types/index.js";
import type { IEmbeddingPort } from "./ports/embedding.port.js";

export type GenerateEmbeddingFn = IEmbeddingPort["embed"];

function assertNonEmptyContextualText(contextualText: string, index: number): string {
  const trimmed = contextualText.trim();
  if (!trimmed) {
    throw new ActiveNoteAnalysisError(
      `Segment at index ${index} has empty contextualText`
    );
  }

  return trimmed;
}

function assertValidEmbeddingVector(vector: unknown): number[] {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new ActiveNoteAnalysisError(
      "Embedding generation returned an empty vector"
    );
  }

  const numericVector = vector.map((value, index) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new ActiveNoteAnalysisError(
        `Embedding generation returned a malformed vector at index ${index}`
      );
    }

    return value;
  });

  return numericVector;
}

export async function generateSegmentEmbeddings(
  segments: ActiveNoteSegment[],
  generateEmbedding: GenerateEmbeddingFn
): Promise<EmbeddedSegment[]> {
  const embeddings = await Promise.all(
    segments.map((segment, index) => {
      const text = assertNonEmptyContextualText(segment.contextualText, index);
      return generateEmbedding(text);
    })
  );

  return segments.map((segment, index) => ({
    ...segment,
    contextualText: assertNonEmptyContextualText(segment.contextualText, index),
    embedding: assertValidEmbeddingVector(embeddings[index]),
  }));
}
