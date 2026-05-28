import { DomainNode } from "../shared.js";
import type { ITaskDetailsProps, ITaskNodeProps } from "./interfaces.js";

export type { ITaskDetailsProps, ITaskNodeProps } from "./interfaces.js";

export class TaskDetails implements ITaskDetailsProps {
  readonly dueDate: Date | null;
  readonly completedAt: Date | null;
  readonly isBlocked: boolean;
  readonly estimatedMinutes: number | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ITaskDetailsProps) {
    this.dueDate = props.dueDate;
    this.completedAt = props.completedAt;
    this.isBlocked = props.isBlocked;
    this.estimatedMinutes = props.estimatedMinutes;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}

export class TaskNode extends DomainNode<"task"> {
  readonly details: TaskDetails | null;

  constructor(props: ITaskNodeProps) {
    super({ ...props, nodeType: "task" });
    this.details = props.details ? new TaskDetails(props.details) : null;
  }
}
