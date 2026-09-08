import type { SpydrNodeStatus, SpydrPriority } from "../../shared/models/shared.js";

export type ProjectChildKind = "task" | "note" | "decision" | "idea" | "resource";

export interface IUpdateProjectChildInput {
  title?: string;
  body?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  rationale?: string;
  impact?: string;
  estimatedMinutes?: number | null;
  assigneePersonNodeId?: string | null;
}

export type { SpydrNodeStatus, SpydrPriority };
