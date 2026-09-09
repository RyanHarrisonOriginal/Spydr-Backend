import type { SpydrTodoItem, SpydrTodoItemSource } from "@prisma/client";
import { TodoItem, type TodoItemSource } from "../../../domains/todos/models/index.js";

export class PrismaTodoItemMapper {
  toDomain(row: SpydrTodoItem): TodoItem {
    return new TodoItem({
      id: row.id,
      orgId: row.orgId,
      userId: row.userId,
      taskNodeId: row.taskNodeId,
      source: row.source as TodoItemSource,
      sortOrder: row.sortOrder,
      addedAt: row.addedAt,
      isStale: row.isStale,
      staleAt: row.staleAt,
      removedAt: row.removedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }

  toPersistence(entity: TodoItem): {
    id: string;
    orgId: string;
    userId: string;
    taskNodeId: string;
    source: SpydrTodoItemSource;
    sortOrder: number;
    addedAt: Date;
    isStale: boolean;
    staleAt: Date | null;
    removedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: entity.id,
      orgId: entity.orgId,
      userId: entity.userId,
      taskNodeId: entity.taskNodeId,
      source: entity.source as SpydrTodoItemSource,
      sortOrder: entity.sortOrder,
      addedAt: entity.addedAt,
      isStale: entity.isStale,
      staleAt: entity.staleAt,
      removedAt: entity.removedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
