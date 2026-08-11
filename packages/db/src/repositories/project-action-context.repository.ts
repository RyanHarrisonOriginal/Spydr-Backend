import { SpydrNodeStatus, SpydrNodeType } from "@prisma/client";
import { prisma } from "../client.js";
import {
  RETRIEVAL_CHILD_NODE_TYPES,
  SPYDR_NODE_DEFAULT_ORDER,
} from "../spydr-query.constants.js";
import type { SpydrProjectDbClient } from "./spydr-project.types.js";

export interface ProjectActionContextChildNode {
  id: string;
  nodeType: SpydrNodeType;
  title: string;
  body: string;
  status: SpydrNodeStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  decisionDetails: {
    decidedAt: Date;
    rationale: string;
  } | null;
}

export interface NoteTaskRelationshipRow {
  noteId: string;
  taskId: string;
}

export async function findProjectActionContextChildNodes(
  orgId: string,
  relatedNodeIds: readonly string[],
  db: Pick<SpydrProjectDbClient, "spydrNode"> = prisma
): Promise<ProjectActionContextChildNode[]> {
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
      createdAt: true,
      updatedAt: true,
      decisionDetails: {
        select: {
          decidedAt: true,
          rationale: true,
        },
      },
    },
    orderBy: SPYDR_NODE_DEFAULT_ORDER,
  });
}

export async function findTaskIdsByNoteIds(
  orgId: string,
  noteIds: readonly string[],
  db: Pick<SpydrProjectDbClient, "spydrNodeRelationship" | "spydrNode"> = prisma
): Promise<NoteTaskRelationshipRow[]> {
  if (noteIds.length === 0) {
    return [];
  }

  const relationships = await db.spydrNodeRelationship.findMany({
    where: {
      orgId,
      relationshipType: "related_to",
      sourceNodeId: { in: [...noteIds] },
    },
    select: {
      sourceNodeId: true,
      targetNodeId: true,
    },
  });

  if (relationships.length === 0) {
    return [];
  }

  const targetIds = relationships.map((relationship) => relationship.targetNodeId);
  const taskNodes = await db.spydrNode.findMany({
    where: {
      orgId,
      id: { in: targetIds },
      nodeType: SpydrNodeType.task,
      isDeleted: false,
    },
    select: { id: true },
  });
  const taskIds = new Set(taskNodes.map((task) => task.id));

  return relationships
    .filter(
      (relationship) =>
        noteIds.includes(relationship.sourceNodeId) &&
        taskIds.has(relationship.targetNodeId)
    )
    .map((relationship) => ({
      noteId: relationship.sourceNodeId,
      taskId: relationship.targetNodeId,
    }));
}
