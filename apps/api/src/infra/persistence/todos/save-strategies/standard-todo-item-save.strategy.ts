import type { PrismaClient } from "@prisma/client";
import type { ISaveStrategy } from "../../../domains/shared/save-strategy.js";
import type { TodoItem } from "../../../domains/todos/models/index.js";
import { PrismaTodoItemMapper } from "../prisma-todo-item.mapper.js";

export class StandardTodoItemSaveStrategy
  implements ISaveStrategy<TodoItem, unknown>
{
  readonly key = "standard";

  constructor(private readonly mapper = new PrismaTodoItemMapper()) {}

  async save(
    entity: TodoItem,
    _context: unknown,
    db: PrismaClient
  ): Promise<TodoItem> {
    const data = this.mapper.toPersistence(entity);
    const row = await db.spydrTodoItem.upsert({
      where: { id: data.id },
      create: data,
      update: {
        source: data.source,
        sortOrder: data.sortOrder,
        addedAt: data.addedAt,
        isStale: data.isStale,
        staleAt: data.staleAt,
        removedAt: data.removedAt,
        updatedAt: data.updatedAt,
      },
    });
    return this.mapper.toDomain(row);
  }
}
