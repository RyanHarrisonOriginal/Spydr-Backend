import { Prisma, type PrismaClient } from "@prisma/client";
import { formatEmbeddingForPgvector } from "../pgvector.js";
import { prisma } from "../client.js";
import type {
  ExistingProjectRetrievalContext,
  UpsertProjectRetrievalContextInput,
} from "./project-retrieval-context.types.js";
import type { ProjectSemanticMatch } from "./project-semantic-search.types.js";

type RetrievalContextDbClient = Pick<PrismaClient, "$executeRaw" | "$queryRaw">;

interface ExistingProjectRetrievalContextRow {
  content_hash: string;
  embedded_at: Date | null;
}

interface ProjectSemanticSearchRow {
  project_id: string;
  context_text: string;
  similarity: number | string;
}

function clampSimilarity(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export async function searchProjectsByEmbedding(
  input: {
    orgId: string;
    embedding: readonly number[];
    limit: number;
  },
  db: Pick<RetrievalContextDbClient, "$queryRaw"> = prisma
): Promise<ProjectSemanticMatch[]> {
  const embeddingVector = formatEmbeddingForPgvector(input.embedding);

  const rows = await db.$queryRaw<ProjectSemanticSearchRow[]>(
    Prisma.sql`
      SELECT
        c.project_id,
        c.context_text,
        1 - (c.embedding <=> ${embeddingVector}::vector) AS similarity
      FROM spydr_active_note_project_retrieval_context c
      INNER JOIN spydr_nodes n ON n.id = c.project_id
      WHERE c.organization_id = ${input.orgId}::uuid
        AND n.org_id = ${input.orgId}::uuid
        AND n.is_deleted = false
        AND n.node_type = 'project'::spydr_node_type
        AND c.embedding IS NOT NULL
      ORDER BY c.embedding <=> ${embeddingVector}::vector
      LIMIT ${input.limit}
    `
  );

  return rows.map((row) => ({
    projectId: row.project_id,
    similarity: clampSimilarity(Number(row.similarity)),
    retrievalDocument: row.context_text,
  }));
}

export async function findExistingProjectRetrievalContext(
  projectId: string,
  db: Pick<RetrievalContextDbClient, "$queryRaw"> = prisma
): Promise<ExistingProjectRetrievalContext | null> {
  const rows = await db.$queryRaw<ExistingProjectRetrievalContextRow[]>(
    Prisma.sql`
      SELECT content_hash, embedded_at
      FROM spydr_active_note_project_retrieval_context
      WHERE project_id = ${projectId}::uuid
      LIMIT 1
    `
  );

  const row = rows[0];
  if (!row) {
    return null;
  }

  return {
    contentHash: row.content_hash,
    embeddedAt: row.embedded_at,
  };
}

export async function upsertProjectRetrievalContext(
  input: UpsertProjectRetrievalContextInput,
  db: Pick<RetrievalContextDbClient, "$executeRaw"> = prisma
): Promise<void> {
  const embeddingVector = formatEmbeddingForPgvector(input.embedding);

  await db.$executeRaw(
    Prisma.sql`
      INSERT INTO spydr_active_note_project_retrieval_context (
        project_id,
        organization_id,
        user_id,
        context_text,
        embedding,
        content_hash,
        embedded_at,
        updated_at
      )
      VALUES (
        ${input.projectId}::uuid,
        ${input.organizationId}::uuid,
        ${input.userId},
        ${input.contextText},
        ${embeddingVector}::vector,
        ${input.contentHash},
        NOW(),
        NOW()
      )
      ON CONFLICT (project_id)
      DO UPDATE SET
        organization_id = EXCLUDED.organization_id,
        user_id = EXCLUDED.user_id,
        context_text = EXCLUDED.context_text,
        embedding = EXCLUDED.embedding,
        content_hash = EXCLUDED.content_hash,
        embedded_at = NOW(),
        updated_at = NOW()
    `
  );
}
