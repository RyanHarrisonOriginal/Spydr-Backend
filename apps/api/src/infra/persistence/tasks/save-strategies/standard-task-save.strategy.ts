import type { PrismaClient } from "@prisma/client";
import type { ISaveStrategy } from "../../../../domains/shared/save-strategy.js";
import type { TaskNode } from "../../../../domains/tasks/models/index.js";
import { PrismaTaskMapper } from "../../prisma/mappers/prisma-task.mapper.js";

export class StandardTaskSaveStrategy implements ISaveStrategy<TaskNode> {
  readonly key = "standard";

  constructor(private readonly mapper = new PrismaTaskMapper()) {}

  async save(
    entity: TaskNode,
    _context: unknown,
    db: PrismaClient
  ): Promise<TaskNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;

    await db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (!entity.details) return;

      const detailsData = this.mapper.toTaskDetailsPersistence(
        entity.id,
        entity.details
      );
      const { nodeId, ...detailsUpdateData } = detailsData;

      await tx.spydrTaskDetails.upsert({
        where: { nodeId },
        create: detailsData,
        update: detailsUpdateData,
      });
    });

    const row = await db.spydrNode.findUnique({
      where: { id: entity.id },
      include: { taskDetails: true },
    });
    if (!row || row.nodeType !== "task") {
      throw new Error("Failed to save task");
    }
    return this.mapper.toDomain(row);
  }
}
