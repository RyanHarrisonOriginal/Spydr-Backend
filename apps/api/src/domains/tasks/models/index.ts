import { DomainNode, isTaskStatus, normalizeSpydrPriority, type TaskStatus, type SpydrPriority } from "../../shared/models/shared.js";
import { normalizeEmoji } from "../../shared/utils/emoji.js";
import type { PersonNode } from "../../people/models/index.js";
import type { ITaskBlockerRef, ITaskDetailsProps, ITaskNodeProps } from "./interfaces.js";

export type { ITaskBlockerRef, ITaskDetailsProps, ITaskNodeProps } from "./interfaces.js";

export interface ITaskUpdateInput {
  title?: string;
  body?: string;
  status?: TaskStatus;
  priority?: SpydrPriority;
  emoji?: string | null;
  dueDate?: Date | null;
  estimatedMinutes?: number | null;
  assigneePersonNodeId?: string | null;
  blockedByNodeId?: string | null;
  followUpAt?: Date | null;
  waitingNote?: string | null;
}

export function parseTaskFollowUpAt(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid follow-up time");
  }
  return date;
}

export function normalizeWaitingNote(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export class TaskDetails implements ITaskDetailsProps {
  emoji: string | null;
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
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(props: ITaskDetailsProps) {
    this.emoji = normalizeEmoji(props.emoji);
    this.dueDate = props.dueDate;
    this.completedAt = props.completedAt;
    this.isBlocked = props.isBlocked;
    this.blockedByNodeId = props.blockedByNodeId;
    this.followUpAt = props.followUpAt;
    this.waitingNote = normalizeWaitingNote(props.waitingNote);
    this.estimatedMinutes = props.estimatedMinutes;
    this.assigneePersonNodeId = props.assigneePersonNodeId;
    this.tags = [...props.tags];
    this.sourceTemplateTaskId = props.sourceTemplateTaskId ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  setDueDate(dueDate: Date | null, now = new Date()): void {
    this.dueDate = dueDate;
    this.touch(now);
  }

  setEmoji(emoji: string | null, now = new Date()): void {
    this.emoji = normalizeEmoji(emoji);
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

  setIsBlocked(isBlocked: boolean, now = new Date()): void {
    this.isBlocked = isBlocked;
    this.touch(now);
  }

  setBlockedByNodeId(blockedByNodeId: string | null, now = new Date()): void {
    this.blockedByNodeId = blockedByNodeId;
    this.touch(now);
  }

  setFollowUpAt(followUpAt: Date | null, now = new Date()): void {
    this.followUpAt = followUpAt;
    this.touch(now);
  }

  setWaitingNote(waitingNote: string | null, now = new Date()): void {
    this.waitingNote = normalizeWaitingNote(waitingNote);
    this.touch(now);
  }

  setSourceTemplateTaskId(sourceTemplateTaskId: string | null, now = new Date()): void {
    this.sourceTemplateTaskId = sourceTemplateTaskId;
    this.touch(now);
  }

  setTags(tags: string[], now = new Date()): void {
    this.tags = [...tags];
    this.touch(now);
  }

  private touch(now = new Date()): void {
    this.updatedAt = now;
  }
}

export class TaskNode extends DomainNode<"task"> {
  details: TaskDetails | null;
  readonly assignee: PersonNode | null;
  readonly blockedBy: ITaskBlockerRef | null;

  constructor(props: ITaskNodeProps) {
    super({ ...props, nodeType: "task" });
    this.details = props.details ? new TaskDetails(props.details) : null;
    this.assignee = props.assignee ?? null;
    this.blockedBy = props.blockedBy ?? null;
  }

  private cloneProps(overrides: Partial<ITaskNodeProps> = {}): ITaskNodeProps {
    return {
      id: this.id,
      orgId: this.orgId,
      userId: this.userId,
      personId: this.personId,
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
      assignee: this.assignee,
      blockedBy: this.blockedBy,
      ...overrides,
    };
  }

  withAssignee(assignee: PersonNode | null): TaskNode {
    return new TaskNode(this.cloneProps({ assignee }));
  }

  withBlockedBy(blockedBy: ITaskBlockerRef | null): TaskNode {
    return new TaskNode(this.cloneProps({ blockedBy }));
  }

  isOpenForTemplateSync(): boolean {
    if (this.isDeleted) return false;
    return this.status !== "completed" && this.status !== "archived";
  }

  bindSourceTemplateTask(templateTaskId: string, now = new Date()): void {
    this.ensureDetails(now).setSourceTemplateTaskId(templateTaskId, now);
    this.touch(now);
  }

  complete(now = new Date()): void {
    this.applyUpdate({ status: "completed" }, now);
    this.ensureDetails(now).setCompletedAt(now, now);
  }

  assertInitialStatusContext(): void {
    if (this.status === "blocked" && !this.details?.blockedByNodeId) {
      throw new Error("Invalid task status: a blocking task is required");
    }
    if (this.details?.blockedByNodeId === this.id) {
      throw new Error("Invalid task status: a task cannot block itself");
    }
    if (this.status === "waiting" && !this.details?.followUpAt) {
      throw new Error("Invalid task status: a follow-up time is required");
    }
  }

  applyUpdate(input: ITaskUpdateInput, now = new Date()): void {
    const previousStatus = this.status;
    const wasCompleted = previousStatus === "completed";
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

    if (input.emoji !== undefined) {
      details.setEmoji(input.emoji, now);
    }
    if (input.dueDate !== undefined) {
      details.setDueDate(input.dueDate, now);
    }
    if (input.estimatedMinutes !== undefined) {
      details.setEstimatedMinutes(input.estimatedMinutes, now);
    }
    if (input.assigneePersonNodeId !== undefined) {
      details.setAssigneePersonNodeId(input.assigneePersonNodeId, now);
    }

    this.reconcileStatusContext(input, previousStatus, now);

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
        emoji: null,
        dueDate: null,
        completedAt: null,
        isBlocked: false,
        blockedByNodeId: null,
        followUpAt: null,
        waitingNote: null,
        estimatedMinutes: null,
        assigneePersonNodeId: null,
        tags: [],
        sourceTemplateTaskId: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    return this.details;
  }

  private reconcileStatusContext(
    input: ITaskUpdateInput,
    previousStatus: TaskStatus | string,
    now: Date
  ): void {
    const details = this.ensureDetails(now);
    const enteredBlocked = this.status === "blocked" && previousStatus !== "blocked";

    if (this.status === "blocked") {
      details.setIsBlocked(true, now);
      if (enteredBlocked || input.blockedByNodeId !== undefined) {
        const blockerId = input.blockedByNodeId ?? null;
        if (!blockerId) {
          throw new Error("Invalid task status: a blocking task is required");
        }
        if (blockerId === this.id) {
          throw new Error("Invalid task status: a task cannot block itself");
        }
        details.setBlockedByNodeId(blockerId, now);
      }
    } else {
      details.setIsBlocked(false, now);
      details.setBlockedByNodeId(null, now);
    }

    const enteredWaiting = this.status === "waiting" && previousStatus !== "waiting";
    if (this.status === "waiting") {
      if (enteredWaiting || input.followUpAt !== undefined) {
        const followUpAt =
          input.followUpAt !== undefined ? input.followUpAt : details.followUpAt;
        if (!followUpAt) {
          throw new Error("Invalid task status: a follow-up time is required");
        }
        details.setFollowUpAt(followUpAt, now);
      }
      if (enteredWaiting || input.waitingNote !== undefined) {
        details.setWaitingNote(input.waitingNote ?? null, now);
      }
    } else if (previousStatus === "waiting") {
      details.setFollowUpAt(null, now);
      details.setWaitingNote(null, now);
    }
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
