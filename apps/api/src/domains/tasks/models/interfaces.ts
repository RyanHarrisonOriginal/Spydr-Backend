import type { IDomainNodeProps, ITimestampedDetails } from "../../shared/models/shared.js";
import type { PersonNode } from "../../people/models/index.js";

export interface ITaskDetailsProps extends ITimestampedDetails {
  dueDate: Date | null;
  completedAt: Date | null;
  isBlocked: boolean;
  estimatedMinutes: number | null;
  assigneePersonNodeId: string | null;
  tags: string[];
}

export interface ITaskNodeProps extends Omit<IDomainNodeProps<"task">, "nodeType"> {
  details: ITaskDetailsProps | null;
  assignee?: PersonNode | null;
}
