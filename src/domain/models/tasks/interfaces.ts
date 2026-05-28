import type { IDomainNodeProps, ITimestampedDetails } from "../shared.js";

export interface ITaskDetailsProps extends ITimestampedDetails {
  dueDate: Date | null;
  completedAt: Date | null;
  isBlocked: boolean;
  estimatedMinutes: number | null;
}

export interface ITaskNodeProps extends Omit<IDomainNodeProps<"task">, "nodeType"> {
  details: ITaskDetailsProps | null;
}
