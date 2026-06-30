import { randomUUID } from "node:crypto";
import type { IDomainMapper } from "../mapper.js";
import { TaskNode } from "../../models/tasks/index.js";
import {
  spydrPriorities,
  type TaskStatus,
  type SpydrPriority,
  isTaskStatus,
} from "../../models/shared.js";

export type TaskNodeMapper<TPersistence = unknown> = IDomainMapper<TPersistence, TaskNode>;

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
  area?: string | null;
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

    return new TaskNode({
      id: randomUUID(),
      userId: context.userId,
      title,
      body: input.body?.trim() ?? "",
      status: this.normalizeStatus(input.status),
      priority: this.normalizePriority(input.priority),
      area: context.area ?? null,
      tags: [],
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      isDeleted: false,
      deletedAt: null,
      details: {
        dueDate: this.parseDate(input.dueDate),
        completedAt: null,
        isBlocked: false,
        estimatedMinutes: input.estimatedMinutes ?? null,
        assigneePersonNodeId: input.assigneePersonNodeId ?? null,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  updateToModel(
    existing: TaskNode,
    input: ITaskUpdateModelInput,
    now = new Date()
  ): TaskNode {
    const title = input.title?.trim() ?? existing.title;
    if (!title) {
      throw new Error("Task title is required");
    }

    const dueDate =
      input.dueDate !== undefined
        ? this.parseDate(input.dueDate)
        : existing.details?.dueDate ?? null;

    return new TaskNode({
      id: existing.id,
      userId: existing.userId,
      title,
      body: input.body !== undefined ? input.body.trim() : existing.body,
      status: input.status ? this.normalizeStatus(input.status) : existing.status,
      priority: input.priority
        ? this.normalizePriority(input.priority)
        : existing.priority,
      area: existing.area,
      tags: existing.tags,
      createdAt: existing.createdAt,
      updatedAt: now,
      archivedAt: existing.archivedAt,
      isDeleted: existing.isDeleted,
      deletedAt: existing.deletedAt,
      details: {
        dueDate,
        completedAt: existing.details?.completedAt ?? null,
        isBlocked: existing.details?.isBlocked ?? false,
        estimatedMinutes:
          input.estimatedMinutes !== undefined
            ? input.estimatedMinutes
            : existing.details?.estimatedMinutes ?? null,
        assigneePersonNodeId:
          input.assigneePersonNodeId !== undefined
            ? input.assigneePersonNodeId
            : existing.details?.assigneePersonNodeId ?? null,
        createdAt: existing.details?.createdAt ?? now,
        updatedAt: now,
      },
      assignee: existing.assignee,
    });
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
