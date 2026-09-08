import { DomainNode, isTaskStatus, normalizeSpydrPriority, type TaskStatus, type SpydrPriority } from "../../shared/models/shared.js";
import type { PersonNode } from "../../people/models/index.js";
import type { ITaskDetailsProps, ITaskNodeProps } from "./interfaces.js";

export type { ITaskDetailsProps, ITaskNodeProps } from "./interfaces.js";

export interface ITaskUpdateInput {
  title?: string;
  body?: string;
  status?: TaskStatus;
  priority?: SpydrPriority;
  dueDate?: Date | null;
  estimatedMinutes?: number | null;
  assigneePersonNodeId?: string | null;
}

export class TaskDetails implements ITaskDetailsProps {
  dueDate: Date | null;
  completedAt: Date | null;
  isBlocked: boolean;
  estimatedMinutes: number | null;
  assigneePersonNodeId: string | null;
  tags: string[];
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: ITaskDetailsProps) {
    this.dueDate = props.dueDate;
    this.completedAt = props.completedAt;
    this.isBlocked = props.isBlocked;
    this.estimatedMinutes = props.estimatedMinutes;
    this.assigneePersonNodeId = props.assigneePersonNodeId;
    this.tags = [...props.tags];
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  setDueDate(dueDate: Date | null, now = new Date()): void {
    this.dueDate = dueDate;
    this.touch(now);
  }

  setEstimatedMinutes(estimatedMinutes: number | null, now = new Date()): void {
    this.estimatedMinutes = estimatedMinutes;
    this.touch(now);
  }

  setAssigneePersonNodeId(assigneePersonNodeId: string | null, now = new Date()): void {
    this.assigneePersonNodeId = assigneePersonNodeId;
    this.touch(now);
  }

  setCompletedAt(completedAt: Date | null, now = new Date()): void {
    this.completedAt = completedAt;
    this.touch(now);
  }

  private touch(now = new Date()): void {
    this.updatedAt = now;
  }
}

export class TaskNode extends DomainNode<"task"> {
  details: TaskDetails | null;
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

  complete(now = new Date()): void {
    this.applyUpdate({ status: "completed" }, now);
    this.ensureDetails(now).setCompletedAt(now, now);
  }

  applyUpdate(input: ITaskUpdateInput, now = new Date()): void {
    const wasCompleted = this.status === "completed";
    const existingCompletedAt = this.details?.completedAt ?? null;

    if (input.title !== undefined) {
      const title = input.title.trim();
      if (!title) {
        throw new Error("Task title is required");
      }
      this.title = title;
    }
    if (input.body !== undefined) {
      this.body = input.body.trim();
    }
    if (input.status !== undefined) {
      this.status = this.normalizeStatus(input.status);
    }
    if (input.priority !== undefined) {
      this.priority = normalizeSpydrPriority(input.priority);
    }

    const details = this.ensureDetails(now);

    if (input.dueDate !== undefined) {
      details.setDueDate(input.dueDate, now);
    }
    if (input.estimatedMinutes !== undefined) {
      details.setEstimatedMinutes(input.estimatedMinutes, now);
    }
    if (input.assigneePersonNodeId !== undefined) {
      details.setAssigneePersonNodeId(input.assigneePersonNodeId, now);
    }

    const isCompleted = this.status === "completed";
    details.setCompletedAt(
      this.resolveCompletedAt(existingCompletedAt, wasCompleted, isCompleted, now),
      now
    );

    this.touch(now);
  }

  private ensureDetails(now = new Date()): TaskDetails {
    if (!this.details) {
      this.details = new TaskDetails({
        dueDate: null,
        completedAt: null,
        isBlocked: false,
        estimatedMinutes: null,
        assigneePersonNodeId: null,
        tags: [],
        createdAt: now,
        updatedAt: now,
      });
    }
    return this.details;
  }

  private resolveCompletedAt(
    existingCompletedAt: Date | null,
    wasCompleted: boolean,
    isCompleted: boolean,
    now: Date
  ): Date | null {
    if (!isCompleted) return null;
    if (wasCompleted && existingCompletedAt) return existingCompletedAt;
    return now;
  }

  private normalizeStatus(status: TaskStatus): TaskStatus {
    if (isTaskStatus(status)) return status;
    throw new Error("Invalid task status");
  }
}
