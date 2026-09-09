import { randomUUID } from "node:crypto";
import {
  TodoItem,
  isTodoItemSource,
  type TodoItemSource,
} from "../models/index.js";

export interface ITodoItemCreateInput {
  taskNodeId: string;
  source?: TodoItemSource;
  sortOrder?: number;
}

export interface ITodoItemCreateContext {
  orgId: string;
  userId: string;
}

export class TodoItemMapper {
  toModel(
    input: ITodoItemCreateInput,
    context: ITodoItemCreateContext,
    now = new Date()
  ): TodoItem {
    const taskNodeId = input.taskNodeId?.trim();
    if (!taskNodeId) {
      throw new Error("Task id is required");
    }

    return new TodoItem({
      id: randomUUID(),
      orgId: context.orgId,
      userId: context.userId,
      taskNodeId,
      source: this.normalizeSource(input.source),
      sortOrder: input.sortOrder ?? 0,
      addedAt: now,
      isStale: false,
      staleAt: null,
      removedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  normalizeSource(source: TodoItemSource | string | undefined): TodoItemSource {
    if (!source) return "user";
    if (isTodoItemSource(source)) return source;
    throw new Error("Invalid todo item source");
  }
}
