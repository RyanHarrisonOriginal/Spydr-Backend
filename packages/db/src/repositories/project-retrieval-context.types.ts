export interface ProjectEmbeddingRecord {
  id: string;
  orgId: string;
  userId: string;
}

export interface ExistingProjectRetrievalContext {
  contentHash: string;
  embeddedAt: Date | null;
}

export interface UpsertProjectRetrievalContextInput {
  projectId: string;
  organizationId: string;
  userId: string;
  contextText: string;
  embedding: number[];
  contentHash: string;
}
