import { randomUUID } from "node:crypto";
import type { IDomainMapper } from "../../shared/mappers/mapper.js";
import { TaskNode } from "../models/index.js";
import {
  spydrPriorities,
  type TaskStatus,
  type SpydrPriority,
  isTaskStatus,
} from "../../shared/models/shared.js";

export type TaskNodeMapper<TPersistence = unknown> = IDomainMapper<TPersistence, TaskNode>;

/** String-date update input for HTTP/commands; parse before TaskNode.applyUpdate. */
export interface ITaskUpdateModelInput {
  title?: string;
  body?: string;
  status?: TaskStatus;
  priority?: SpydrPriority;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  assigneePersonNodeId?: string | null;
}

export interface ITaskCreateModelInput {
  title: string;
  body?: string;
  status?: TaskStatus;
  priority?: SpydrPriority;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  assigneePersonNodeId?: string | null;
}

export interface ITaskCreateModelContext {
  userId: string;
  orgId: string;
  area?: string | null;
  sortOrder?: number;
}

export class TaskMapper {
  toModel(
    input: ITaskCreateModelInput,
    context: ITaskCreateModelContext,
    now = new Date()
  ): TaskNode {
    const title = input.title?.trim();
    if (!title) {
      throw new Error("Task title is required");
    }

    const status = this.normalizeStatus(input.status);

    return new TaskNode({
      id: randomUUID(),
      orgId: context.orgId,
      userId: context.userId,
      title,
      body: input.body?.trim() ?? "",
      status,
      priority: this.normalizePriority(input.priority),
      area: context.area ?? null,
      tags: [],
      sortOrder: context.sortOrder,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      isDeleted: false,
      deletedAt: null,
      details: {
        dueDate: this.parseDate(input.dueDate),
        completedAt: this.resolveCompletedAt(null, false, status === "completed", now),
        isBlocked: false,
        estimatedMinutes: input.estimatedMinutes ?? null,
        assigneePersonNodeId: input.assigneePersonNodeId ?? null,
        tags: [],
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  /** Keep completedAt in sync with completed status. */
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

  private normalizeStatus(status: TaskStatus | undefined): TaskStatus {
    if (!status) return "active";
    if (isTaskStatus(status)) return status;
    throw new Error("Invalid task status");
  }

  private normalizePriority(priority: SpydrPriority | undefined): SpydrPriority {
    if (!priority) return "medium";
    if (spydrPriorities.includes(priority)) return priority;
    throw new Error("Invalid task priority");
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid task date");
    }

    return date;
  }
}
