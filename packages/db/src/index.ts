export { prisma, disconnectPrisma, type PrismaClient } from "./client.js";

export { formatEmbeddingForPgvector } from "./pgvector.js";
export {
  findExistingProjectRetrievalContext,
  upsertProjectRetrievalContext,
  searchProjectsByEmbedding,
} from "./repositories/project-retrieval-context.repository.js";
export type { ProjectSemanticMatch } from "./repositories/project-semantic-search.types.js";
export {
  countProjectChildNodesByType,
  findActiveProjectSummary,
  findProjectForEmbedding,
  findProjectRelatedNodeIds,
  findProjectRetrievalChildNodes,
  findProjectRetrievalHeader,
} from "./repositories/spydr-project.repository.js";
export {
  findProjectActionContextChildNodes,
  findTaskIdsByNoteIds,
} from "./repositories/project-action-context.repository.js";
export type {
  ProjectActionContextChildNode,
  NoteTaskRelationshipRow,
} from "./repositories/project-action-context.repository.js";
export type {
  ExistingProjectRetrievalContext,
  ProjectEmbeddingRecord,
  UpsertProjectRetrievalContextInput,
} from "./repositories/project-retrieval-context.types.js";
export type {
  ActiveProjectSummary,
  ProjectChildNodeCounts,
  ProjectRetrievalHeader,
  SpydrProjectDbClient,
} from "./repositories/spydr-project.types.js";
