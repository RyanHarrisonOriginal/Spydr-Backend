import type { PrismaClient } from "@prisma/client";
import type { ISaveStrategy } from "../../../../domains/shared/save-strategy.js";
import type { TaskNode } from "../../../../domains/tasks/models/index.js";
import { PrismaTaskMapper } from "../../prisma/mappers/prisma-task.mapper.js";

/**
 * Completes a task: persists node status plus task_details.completed_at.
 * Requires details on the entity (set by TaskNode.complete()).
 */
export class TaskCompleteSaveStrategy implements ISaveStrategy<TaskNode> {
  readonly key = "complete";

  constructor(private readonly mapper = new PrismaTaskMapper()) {}

  async save(
    entity: TaskNode,
    _context: unknown,
    db: PrismaClient
  ): Promise<TaskNode> {
    if (!entity.details?.completedAt) {
      throw new Error("complete strategy requires task details with completedAt");
    }

    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;
    const detailsData = this.mapper.toTaskDetailsPersistence(
      entity.id,
      entity.details
    );
    const { nodeId, ...detailsUpdateData } = detailsData;

    await db.$transaction(async (tx) => {
      await tx.spydrNode.update({
        where: { id },
        data: nodeUpdateData,
      });

      await tx.spydrTaskDetails.upsert({
        where: { nodeId },
        create: detailsData,
        update: {
          ...detailsUpdateData,
          completedAt: entity.details!.completedAt,
        },
      });
    });

    const row = await db.spydrNode.findUnique({
      where: { id: entity.id },
      include: { taskDetails: true },
    });
    if (!row || row.nodeType !== "task") {
      throw new Error("Failed to complete task");
    }
    return this.mapper.toDomain(row);
  }
}
