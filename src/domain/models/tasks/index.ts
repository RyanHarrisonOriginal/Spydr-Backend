import { DomainNode } from "../shared.js";
import type { PersonNode } from "../people/index.js";
import type { ITaskDetailsProps, ITaskNodeProps } from "./interfaces.js";

export type { ITaskDetailsProps, ITaskNodeProps } from "./interfaces.js";

export class TaskDetails implements ITaskDetailsProps {
  readonly dueDate: Date | null;
  readonly completedAt: Date | null;
  readonly isBlocked: boolean;
  readonly estimatedMinutes: number | null;
  readonly assigneePersonNodeId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ITaskDetailsProps) {
    this.dueDate = props.dueDate;
    this.completedAt = props.completedAt;
    this.isBlocked = props.isBlocked;
    this.estimatedMinutes = props.estimatedMinutes;
    this.assigneePersonNodeId = props.assigneePersonNodeId;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}

export class TaskNode extends DomainNode<"task"> {
  readonly details: TaskDetails | null;
  readonly assignee: PersonNode | null;

  constructor(props: ITaskNodeProps) {
    super({ ...props, nodeType: "task" });
    this.details = props.details ? new TaskDetails(props.details) : null;
    this.assignee = props.assignee ?? null;
  }

  withAssignee(assignee: PersonNode | null): TaskNode {
    return new TaskNode({
      id: this.id,
      orgId: this.orgId,
      userId: this.userId,
      title: this.title,
      body: this.body,
      status: this.status,
      priority: this.priority,
      area: this.area,
      tags: this.tags,
      sortOrder: this.sortOrder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      archivedAt: this.archivedAt,
      isDeleted: this.isDeleted,
      deletedAt: this.deletedAt,
      details: this.details,
      assignee,
    });
  }
}
