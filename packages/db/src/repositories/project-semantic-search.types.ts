export interface ProjectSemanticMatch {
  projectId: string;
  similarity: number;
  retrievalDocument: string;
}

export interface SearchProjectsByEmbeddingInput {
  orgId: string;
  embedding: readonly number[];
  limit: number;
}
