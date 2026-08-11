import type { SpydrNodeStatus, SpydrPriority, TaskStatus } from "../models/shared.js";
import { isTaskStatus } from "../models/shared.js";

export type TransformableNodeType = "project" | "task" | "note" | "idea";

export const TRANSFORMABLE_NODE_TYPES = new Set<TransformableNodeType>([
  "project",
  "task",
  "note",
  "idea",
]);

export function isTransformableNodeType(value: string): value is TransformableNodeType {
  return TRANSFORMABLE_NODE_TYPES.has(value as TransformableNodeType);
}

export function assertTransformAllowed(
  fromType: TransformableNodeType,
  toType: TransformableNodeType
): void {
  if (fromType === toType) {
    throw new Error("Target type must differ from the current type");
  }

  const allowed: Record<TransformableNodeType, TransformableNodeType[]> = {
    project: ["task", "note"],
    task: ["project"],
    note: ["task", "project"],
    idea: ["task", "project"],
  };

  if (!allowed[fromType].includes(toType)) {
    throw new Error(`Cannot transform ${fromType} into ${toType}`);
  }
}

export function toTaskStatus(status: SpydrNodeStatus | string): TaskStatus {
  if (isTaskStatus(status)) return status;
  if (status === "completed" || status === "archived") return "completed";
  if (status === "blocked") return "blocked";
  if (status === "waiting" || status === "snoozed") return "waiting";
  return "active";
}

export function toProjectStatus(status: SpydrNodeStatus | string): SpydrNodeStatus {
  const compatible: SpydrNodeStatus[] = [
    "active",
    "waiting",
    "blocked",
    "completed",
    "inactive",
    "archived",
    "snoozed",
  ];
  if (compatible.includes(status as SpydrNodeStatus)) {
    return status as SpydrNodeStatus;
  }
  return "active";
}

export interface INodeTypeSnapshot {
  title: string;
  body: string;
  status: string;
  priority: string;
  area: string | null;
  tags: string[];
  details: Record<string, unknown> | null;
}

export interface INodeTypeTransformRequest {
  orgId: string;
  userId: string;
  nodeId: string;
  targetType: "project" | "task" | "note";
  projectId?: string | null;
}

export interface INodeTypeTransformResult {
  nodeId: string;
  previousType: TransformableNodeType;
  currentType: "project" | "task" | "note";
  projectId: string | null;
  transformedAt: Date;
}

export function defaultTaskDetailsFromSource(input: {
  now: Date;
  projectDetails?: {
    targetDate?: Date | null;
    assigneePersonNodeId?: string | null;
  } | null;
  taskDetails?: {
    dueDate?: Date | null;
    assigneePersonNodeId?: string | null;
  } | null;
}) {
  const { now, projectDetails, taskDetails } = input;
  return {
    dueDate: taskDetails?.dueDate ?? projectDetails?.targetDate ?? null,
    completedAt: null as Date | null,
    isBlocked: false,
    estimatedMinutes: null as number | null,
    assigneePersonNodeId:
      taskDetails?.assigneePersonNodeId ?? projectDetails?.assigneePersonNodeId ?? null,
    tags: [] as string[],
    createdAt: now,
    updatedAt: now,
  };
}

export function defaultProjectDetailsFromSource(input: {
  now: Date;
  priority: SpydrPriority;
  projectDetails?: {
    outcome?: string | null;
    startDate?: Date | null;
    targetDate?: Date | null;
    riskLevel?: SpydrPriority;
    assigneePersonNodeId?: string | null;
  } | null;
  taskDetails?: {
    dueDate?: Date | null;
    assigneePersonNodeId?: string | null;
  } | null;
  ideaDetails?: {
    potentialValue?: SpydrPriority;
  } | null;
}) {
  const { now, priority, projectDetails, taskDetails, ideaDetails } = input;
  return {
    outcome: projectDetails?.outcome ?? null,
    startDate: projectDetails?.startDate ?? null,
    targetDate: projectDetails?.targetDate ?? taskDetails?.dueDate ?? null,
    riskLevel:
      projectDetails?.riskLevel ?? ideaDetails?.potentialValue ?? priority,
    lastActivityAt: null as Date | null,
    requesterPersonNodeId: null as string | null,
    assigneePersonNodeId:
      projectDetails?.assigneePersonNodeId ?? taskDetails?.assigneePersonNodeId ?? null,
    sponsorPersonNodeId: null as string | null,
    reviewerPersonNodeId: null as string | null,
    createdAt: now,
    updatedAt: now,
  };
}
