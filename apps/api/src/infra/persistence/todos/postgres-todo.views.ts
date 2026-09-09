import type { PrismaClient } from "@prisma/client";
import type {
  ITodoListItem,
  ITodoViews,
} from "../../../domains/todos/views.js";
import type { TodoItem } from "../../../domains/todos/models/index.js";
import type { ITaskViews } from "../../../domains/tasks/views.js";
import { PrismaTodoItemMapper } from "./prisma-todo-item.mapper.js";

export class PostgresTodoViews implements ITodoViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly taskViews: ITaskViews,
    private readonly mapper = new PrismaTodoItemMapper()
  ) {}

  async listActiveByUser(orgId: string, userId: string): Promise<ITodoListItem[]> {
    const rows = await this.db.spydrTodoItem.findMany({
      where: { orgId, userId, removedAt: null },
      orderBy: [{ sortOrder: "asc" }, { addedAt: "asc" }],
    });
    if (rows.length === 0) return [];

    const items = rows.map((row) => this.mapper.toDomain(row));
    const tasks = await this.taskViews.listByOrg(orgId);
    const taskById = new Map(tasks.map((entry) => [entry.task.id, entry]));

    const results: ITodoListItem[] = [];
    for (const item of items) {
      const task = taskById.get(item.taskNodeId);
      if (task) results.push({ item, task });
    }
    return results;
  }

  async getByTask(
    orgId: string,
    userId: string,
    taskNodeId: string
  ): Promise<TodoItem | null> {
    const row = await this.db.spydrTodoItem.findUnique({
      where: {
        orgId_userId_taskNodeId: { orgId, userId, taskNodeId },
      },
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async getListItem(
    orgId: string,
    userId: string,
    todoId: string
  ): Promise<ITodoListItem | null> {
    const row = await this.db.spydrTodoItem.findFirst({
      where: { id: todoId, orgId, userId, removedAt: null },
    });
    if (!row) return null;

    const item = this.mapper.toDomain(row);
    const task = await this.taskViews.getListItem(orgId, item.taskNodeId);
    if (!task) return null;
    return { item, task };
  }
}
