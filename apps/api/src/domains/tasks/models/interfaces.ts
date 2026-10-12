import type { IDomainNodeProps, ITimestampedDetails } from "../../shared/models/shared.js";
import type { PersonNode } from "../../people/models/index.js";

export interface ITaskBlockerRef {
  id: string;
  title: string;
}

export interface ITaskDetailsProps extends ITimestampedDetails {
  emoji?: string | null;
  dueDate: Date | null;
  completedAt: Date | null;
  isBlocked: boolean;
  blockedByNodeId: string | null;
  followUpAt: Date | null;
  waitingNote: string | null;
  estimatedMinutes: number | null;
  assigneePersonNodeId: string | null;
  tags: string[];
  sourceTemplateTaskId: string | null;
}

export interface ITaskNodeProps extends Omit<IDomainNodeProps<"task">, "nodeType"> {
  details: ITaskDetailsProps | null;
  assignee?: PersonNode | null;
  blockedBy?: ITaskBlockerRef | null;
}
