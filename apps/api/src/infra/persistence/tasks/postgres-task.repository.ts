import type { PrismaClient } from "@prisma/client";
import type { IGetCriteria, ISaveOptions } from "../../../domains/shared/repository.js";
import {
  resolveSaveStrategy,
  type ISaveStrategy,
} from "../../../domains/shared/save-strategy.js";
import type { ITaskRepository } from "../../../domains/tasks/repository.js";
import type { TaskNode } from "../../../domains/tasks/models/index.js";
import { PrismaTaskMapper } from "../prisma/mappers/prisma-task.mapper.js";
import { StandardTaskSaveStrategy } from "./save-strategies/standard-task-save.strategy.js";
import { TaskWithProjectLinkSaveStrategy } from "./save-strategies/task-with-project-link.strategy.js";
import { TaskAssignProjectSaveStrategy } from "./save-strategies/task-assign-project.strategy.js";
import { TaskCompleteSaveStrategy } from "./save-strategies/task-complete.strategy.js";

export class PostgresTaskRepository implements ITaskRepository {
  private readonly strategies: Map<string, ISaveStrategy<TaskNode, unknown>>;

  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaTaskMapper(),
    strategies?: ISaveStrategy<TaskNode, unknown>[]
  ) {
    const list =
      strategies ??
      ([
        new StandardTaskSaveStrategy(this.mapper),
        new TaskWithProjectLinkSaveStrategy(this.mapper),
        new TaskAssignProjectSaveStrategy(this.mapper),
        new TaskCompleteSaveStrategy(this.mapper),
      ] as ISaveStrategy<TaskNode, unknown>[]);
    this.strategies = new Map(list.map((s) => [s.key, s]));
  }

  async get(criteria: IGetCriteria): Promise<TaskNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: {
        id: criteria.id,
        ...(criteria.orgId ? { orgId: criteria.orgId } : {}),
        nodeType: "task",
        ...(criteria.includeDeleted ? {} : {}),
      },
      include: { taskDetails: true },
    });

    return row ? this.mapper.toDomain(row) : null;
  }

  async save(entity: TaskNode, options?: ISaveOptions): Promise<TaskNode> {
    const strategy = resolveSaveStrategy(
      this.strategies,
      options?.strategy ?? "standard"
    );
    return strategy.save(entity, options?.context, this.db);
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
