import { randomUUID } from "node:crypto";
import type { IDomainMapper } from "../mapper.js";
import { TaskNode } from "../../models/tasks/index.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../models/shared.js";

export type TaskNodeMapper<TPersistence = unknown> = IDomainMapper<TPersistence, TaskNode>;

export interface ITaskCreateModelInput {
  title: string;
  body?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
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
      details: {
        dueDate: this.parseDate(input.dueDate),
        completedAt: null,
        isBlocked: false,
        estimatedMinutes: input.estimatedMinutes ?? null,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  private normalizeStatus(status: SpydrNodeStatus | undefined): SpydrNodeStatus {
    if (!status) return "active";
    if (spydrNodeStatuses.includes(status)) return status;
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
