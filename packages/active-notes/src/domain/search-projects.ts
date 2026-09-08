import type { ProjectSemanticMatch } from "./types/index.js";
import type { IProjectSearchPort } from "./ports/project-search.port.js";

export const DEFAULT_PROJECT_SEARCH_LIMIT = 5;
export const MAX_PROJECT_SEARCH_LIMIT = 20;

export class ProjectRetrievalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectRetrievalError";
  }
}

function assertValidQueryEmbedding(embedding: unknown): number[] {
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new ProjectRetrievalError("Query embedding is required");
  }

  return embedding.map((value, index) => {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new ProjectRetrievalError(
        `Query embedding contains a non-finite value at index ${index}`
      );
    }

    return value;
  });
}

export function resolveProjectSearchLimit(limit?: number): number {
  if (limit === undefined) {
    return DEFAULT_PROJECT_SEARCH_LIMIT;
  }

  if (!Number.isFinite(limit) || limit < 1) {
    throw new ProjectRetrievalError("Search limit must be a positive number");
  }

  return Math.min(Math.floor(limit), MAX_PROJECT_SEARCH_LIMIT);
}

export async function searchProjects(
  projectSearch: IProjectSearchPort,
  orgId: string,
  embedding: number[],
  limit?: number
): Promise<ProjectSemanticMatch[]> {
  if (!orgId.trim()) {
    throw new ProjectRetrievalError(
      "Organization id is required for project search"
    );
  }

  return projectSearch.search(
    orgId,
    assertValidQueryEmbedding(embedding),
    resolveProjectSearchLimit(limit)
  );
}
