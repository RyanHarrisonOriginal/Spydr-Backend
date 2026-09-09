import type { PrismaClient } from "@prisma/client";
import type { IGetCriteria, ISaveOptions } from "../../../domains/shared/repository.js";
import {
  resolveSaveStrategy,
  type ISaveStrategy,
} from "../../../domains/shared/save-strategy.js";
import type { ITodoItemRepository } from "../../../domains/todos/repository.js";
import type { TodoItem } from "../../../domains/todos/models/index.js";
import { PrismaTodoItemMapper } from "./prisma-todo-item.mapper.js";
import { StandardTodoItemSaveStrategy } from "./save-strategies/standard-todo-item-save.strategy.js";

export class PostgresTodoItemRepository implements ITodoItemRepository {
  private readonly strategies: Map<string, ISaveStrategy<TodoItem, unknown>>;

  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaTodoItemMapper(),
    strategies?: ISaveStrategy<TodoItem, unknown>[]
  ) {
    const list = strategies ?? [new StandardTodoItemSaveStrategy(this.mapper)];
    this.strategies = new Map(list.map((s) => [s.key, s]));
  }

  async get(criteria: IGetCriteria): Promise<TodoItem | null> {
    const row = await this.db.spydrTodoItem.findFirst({
      where: {
        id: criteria.id,
        ...(criteria.orgId ? { orgId: criteria.orgId } : {}),
      },
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async save(entity: TodoItem, options?: ISaveOptions): Promise<TodoItem> {
    const strategy = resolveSaveStrategy(
      this.strategies,
      options?.strategy ?? "standard"
    );
    return strategy.save(entity, options?.context, this.db);
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrTodoItem.delete({ where: { id } });
  }
}
