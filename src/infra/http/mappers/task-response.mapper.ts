import type { ITaskListItem } from "../../../domain/interfaces/task-repository.js";
import type { TaskNode } from "../../../domain/models/tasks/index.js";
import type { IRepresentationMapper } from "../../../domain/mappers/index.js";
import { nodeLifecycleResponse } from "./node-lifecycle-response.js";

export interface ITaskProjectResponse {
  id: string;
  title: string;
}

export interface ITaskResponse {
  id: string;
  userId: string;
  nodeType: "task";
  title: string;
  body: string;
  status: string;
  priority: string;
  area: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  project: ITaskProjectResponse | null;
  details: {
    dueDate: string | null;
    completedAt: string | null;
    isBlocked: boolean;
    estimatedMinutes: number | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export class TaskResponseMapper
  implements IRepresentationMapper<TaskNode, ITaskResponse>
{
  toRepresentation(domain: TaskNode, project: ITaskProjectResponse | null = null): ITaskResponse {
    return {
      id: domain.id,
      userId: domain.userId,
      nodeType: domain.nodeType,
      title: domain.title,
      body: domain.body,
      status: domain.status,
      priority: domain.priority,
      area: domain.area,
      tags: domain.tags,
      createdAt: domain.createdAt.toISOString(),
      updatedAt: domain.updatedAt.toISOString(),
      archivedAt: domain.archivedAt?.toISOString() ?? null,
      ...nodeLifecycleResponse(domain),
      project,
      details: domain.details
        ? {
            dueDate: this.toDateOnly(domain.details.dueDate),
            completedAt: domain.details.completedAt?.toISOString() ?? null,
            isBlocked: domain.details.isBlocked,
            estimatedMinutes: domain.details.estimatedMinutes,
            createdAt: domain.details.createdAt.toISOString(),
            updatedAt: domain.details.updatedAt.toISOString(),
          }
        : null,
    };
  }

  toListRepresentation(item: ITaskListItem): ITaskResponse {
    return this.toRepresentation(item.task, item.project);
  }

  private toDateOnly(date: Date | null): string | null {
    return date?.toISOString().slice(0, 10) ?? null;
  }
}
