import { searchProjectsByEmbedding } from "@spydr/db";
import {
  DEFAULT_PROJECT_SEARCH_LIMIT,
  type IProjectSearchPort,
  type ProjectSemanticMatch,
} from "../domain/index.js";

export type SearchProjectsByEmbeddingFn = typeof searchProjectsByEmbedding;

export class PostgresProjectSearchAdapter implements IProjectSearchPort {
  constructor(
    private readonly searchProjectsByEmbeddingFn: SearchProjectsByEmbeddingFn = searchProjectsByEmbedding
  ) {}

  search(
    orgId: string,
    embedding: number[],
    limit = DEFAULT_PROJECT_SEARCH_LIMIT
  ): Promise<ProjectSemanticMatch[]> {
    return this.searchProjectsByEmbeddingFn({
      orgId,
      embedding,
      limit,
    });
  }
}
