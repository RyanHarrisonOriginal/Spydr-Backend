import type { ITodoListItem } from "../../../domains/todos/views.js";
import type { TodoItem } from "../../../domains/todos/models/index.js";
import {
  TaskResponseMapper,
  type ITaskResponse,
} from "./task-response.mapper.js";

export interface ITodoItemResponse {
  id: string;
  organizationId: string;
  userId: string;
  taskId: string;
  source: string;
  sortOrder: number;
  addedAt: string;
  isStale: boolean;
  staleAt: string | null;
  ageHours: number;
  task: ITaskResponse;
}

export class TodoItemResponseMapper {
  constructor(private readonly taskMapper = new TaskResponseMapper()) {}

  toRepresentation(entry: ITodoListItem, now = new Date()): ITodoItemResponse {
    return this.fromParts(entry.item, entry.task, now);
  }

  private fromParts(
    item: TodoItem,
    task: ITodoListItem["task"],
    now: Date
  ): ITodoItemResponse {
    return {
      id: item.id,
      organizationId: item.orgId,
      userId: item.userId,
      taskId: item.taskNodeId,
      source: item.source,
      sortOrder: item.sortOrder,
      addedAt: item.addedAt.toISOString(),
      isStale: item.isStale,
      staleAt: item.staleAt?.toISOString() ?? null,
      ageHours: item.ageHours(now),
      task: this.taskMapper.toListRepresentation(task),
    };
  }
}
