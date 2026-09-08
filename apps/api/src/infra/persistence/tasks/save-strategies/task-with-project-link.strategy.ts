import type { PrismaClient } from "@prisma/client";
import type { ISaveStrategy } from "../../../../domains/shared/save-strategy.js";
import type {
  ITaskWithProjectLinkContext,
} from "../../../../domains/tasks/repository.js";
import type { TaskNode } from "../../../../domains/tasks/models/index.js";
import { PrismaTaskMapper } from "../../prisma/mappers/prisma-task.mapper.js";

export class TaskWithProjectLinkSaveStrategy
  implements ISaveStrategy<TaskNode, ITaskWithProjectLinkContext>
{
  readonly key = "withProjectLink";

  constructor(private readonly mapper = new PrismaTaskMapper()) {}

  async save(
    entity: TaskNode,
    context: ITaskWithProjectLinkContext | undefined,
    db: PrismaClient
  ): Promise<TaskNode> {
    if (!context?.projectId) {
      throw new Error("withProjectLink strategy requires projectId context");
    }

    const nodeData = this.mapper.toPersistence(entity);
    const detailsData = entity.details
      ? this.mapper.toTaskDetailsPersistence(entity.id, entity.details)
      : null;

    await db.$transaction(async (tx) => {
      await tx.spydrNode.create({ data: nodeData });

      if (detailsData) {
        await tx.spydrTaskDetails.create({ data: detailsData });
      }

      await tx.spydrNodeRelationship.create({
        data: {
          orgId: entity.orgId,
          userId: entity.userId,
          sourceNodeId: context.projectId,
          targetNodeId: entity.id,
          relationshipType: "related_to",
          reason: "Project task",
        },
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
