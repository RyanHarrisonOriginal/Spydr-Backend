import {
  searchProjectsByEmbedding,
} from "@spydr/db";
import type { ProjectSemanticMatch } from "../types/index.js";

export const DEFAULT_PROJECT_SEARCH_LIMIT = 5;
export const MAX_PROJECT_SEARCH_LIMIT = 20;

export class ProjectRetrievalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectRetrievalError";
  }
}

export type SearchProjectsByEmbeddingFn = typeof searchProjectsByEmbedding;

export interface ProjectRetrievalServiceOptions {
  orgId: string;
  searchProjectsByEmbedding?: SearchProjectsByEmbeddingFn;
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

export class ProjectRetrievalService {
  private readonly orgId: string;
  private readonly searchProjectsByEmbedding: SearchProjectsByEmbeddingFn;

  constructor(options: ProjectRetrievalServiceOptions) {
    if (!options.orgId.trim()) {
      throw new ProjectRetrievalError("Organization id is required for project search");
    }

    this.orgId = options.orgId;
    this.searchProjectsByEmbedding =
      options.searchProjectsByEmbedding ?? searchProjectsByEmbedding;
  }

  async search(
    embedding: number[],
    limit = DEFAULT_PROJECT_SEARCH_LIMIT
  ): Promise<ProjectSemanticMatch[]> {
    const validatedEmbedding = assertValidQueryEmbedding(embedding);
    const resolvedLimit = resolveProjectSearchLimit(limit);

    return this.searchProjectsByEmbedding({
      orgId: this.orgId,
      embedding: validatedEmbedding,
      limit: resolvedLimit,
    });
  }
}
