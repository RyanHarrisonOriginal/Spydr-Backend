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

/** Matches backend dashboard/person-work open-task semantics. */
export const CLOSED_TASK_STATUSES = [
  SpydrNodeStatus.completed,
  SpydrNodeStatus.archived,
] as const;

/** Default ordering used by backend Spydr node repositories. */
export const SPYDR_NODE_DEFAULT_ORDER = [
  { sortOrder: "asc" as const },
  { updatedAt: "desc" as const },
];

export function isOpenTaskStatus(status: SpydrNodeStatus): boolean {
  return (
    status !== SpydrNodeStatus.completed && status !== SpydrNodeStatus.archived
  );
}
