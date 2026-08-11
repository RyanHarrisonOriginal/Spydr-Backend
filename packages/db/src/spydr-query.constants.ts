import { SpydrNodeStatus, SpydrNodeType } from "@prisma/client";

/** Child node types linked to a project via `SpydrNodeRelationship`. */
export const PROJECT_CHILD_NODE_TYPES = [
  SpydrNodeType.task,
  SpydrNodeType.decision,
  SpydrNodeType.idea,
  SpydrNodeType.note,
  SpydrNodeType.resource,
] as const;

/** Node types included in the project retrieval document. */
export const RETRIEVAL_CHILD_NODE_TYPES = [
  SpydrNodeType.task,
  SpydrNodeType.decision,
  SpydrNodeType.idea,
  SpydrNodeType.note,
] as const;

/** Default ordering used by backend Spydr node repositories. */
export const SPYDR_NODE_DEFAULT_ORDER = [
  { sortOrder: "asc" as const },
  { updatedAt: "desc" as const },
];

/** Prisma select shape for project-scoped retrieval child nodes. */
export interface RelatedRetrievalNode {
  id: string;
  nodeType: SpydrNodeType;
  title: string;
  body: string;
  status: SpydrNodeStatus;
  sortOrder: number;
  updatedAt: Date;
  decisionDetails: {
    decidedAt: Date;
  } | null;
}
