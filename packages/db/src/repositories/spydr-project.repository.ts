import type { SpydrNodeType } from "@prisma/client";
import { SpydrNodeType as NodeType } from "@prisma/client";
import { prisma } from "../client.js";
import {
  PROJECT_CHILD_NODE_TYPES,
  RETRIEVAL_CHILD_NODE_TYPES,
  SPYDR_NODE_DEFAULT_ORDER,
  type RelatedRetrievalNode,
} from "../spydr-query.constants.js";
import type {
  ActiveProjectSummary,
  ProjectChildNodeCounts,
  ProjectRetrievalHeader,
  SpydrProjectDbClient,
} from "./spydr-project.types.js";
import type { ProjectEmbeddingRecord } from "./project-retrieval-context.types.js";

export async function findProjectRelatedNodeIds(
  projectId: string,
  orgId: string,
  db: Pick<SpydrProjectDbClient, "spydrNodeRelationship"> = prisma
): Promise<string[]> {
  const relationships = await db.spydrNodeRelationship.findMany({
    where: {
      orgId,
      OR: [{ sourceNodeId: projectId }, { targetNodeId: projectId }],
    },
    select: {
      sourceNodeId: true,
      targetNodeId: true,
    },
  });

  return relationships.map((relationship) =>
    relationship.sourceNodeId === projectId
      ? relationship.targetNodeId
      : relationship.sourceNodeId
  );
}

export async function findActiveProjectSummary(
  projectId: string,
  db: Pick<SpydrProjectDbClient, "spydrNode"> = prisma
): Promise<ActiveProjectSummary | null> {
  return db.spydrNode.findFirst({
    where: {
      id: projectId,
      nodeType: NodeType.project,
      isDeleted: false,
    },
    select: {
      id: true,
      orgId: true,
      title: true,
      body: true,
      status: true,
      updatedAt: true,
    },
  });
}

export async function findProjectForEmbedding(
  projectId: string,
  db: Pick<SpydrProjectDbClient, "spydrNode"> = prisma
): Promise<ProjectEmbeddingRecord | null> {
  return db.spydrNode.findFirst({
    where: {
      id: projectId,
      nodeType: NodeType.project,
      isDeleted: false,
    },
    select: {
      id: true,
      orgId: true,
      userId: true,
    },
  });
}

export async function findProjectRetrievalHeader(
  projectId: string,
  db: Pick<SpydrProjectDbClient, "spydrNode"> = prisma
): Promise<ProjectRetrievalHeader | null> {
  return db.spydrNode.findFirst({
    where: {
      id: projectId,
      nodeType: NodeType.project,
      isDeleted: false,
    },
    select: {
      orgId: true,
      title: true,
      body: true,
    },
  });
}

export async function countProjectChildNodesByType(
  orgId: string,
  relatedNodeIds: readonly string[],
  db: Pick<SpydrProjectDbClient, "spydrNode"> = prisma
): Promise<ProjectChildNodeCounts> {
  if (relatedNodeIds.length === 0) {
    return {
      taskCount: 0,
      noteCount: 0,
      decisionCount: 0,
      ideaCount: 0,
    };
  }

  const relatedCounts = await db.spydrNode.groupBy({
    by: ["nodeType"],
    where: {
      id: { in: [...relatedNodeIds] },
      orgId,
      isDeleted: false,
      nodeType: { in: [...PROJECT_CHILD_NODE_TYPES] },
    },
    _count: {
      _all: true,
    },
  });

  const countByType = new Map<SpydrNodeType, number>(
    relatedCounts.map((entry) => [entry.nodeType, entry._count._all])
  );

  return {
    taskCount: countByType.get(NodeType.task) ?? 0,
    noteCount: countByType.get(NodeType.note) ?? 0,
    decisionCount: countByType.get(NodeType.decision) ?? 0,
    ideaCount: countByType.get(NodeType.idea) ?? 0,
  };
}

export async function findProjectRetrievalChildNodes(
  orgId: string,
  relatedNodeIds: readonly string[],
  db: Pick<SpydrProjectDbClient, "spydrNode"> = prisma
): Promise<RelatedRetrievalNode[]> {
  if (relatedNodeIds.length === 0) {
    return [];
  }

  return db.spydrNode.findMany({
    where: {
      orgId,
      id: { in: [...relatedNodeIds] },
      isDeleted: false,
      nodeType: { in: [...RETRIEVAL_CHILD_NODE_TYPES] },
    },
    select: {
      id: true,
      nodeType: true,
      title: true,
      body: true,
      status: true,
      sortOrder: true,
      updatedAt: true,
      decisionDetails: {
        select: {
          decidedAt: true,
        },
      },
    },
    orderBy: SPYDR_NODE_DEFAULT_ORDER,
  });
}
