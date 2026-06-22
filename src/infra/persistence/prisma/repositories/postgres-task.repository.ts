import type { PrismaClient } from "@prisma/client";
import type { ITaskRepository } from "../../../../domain/interfaces/index.js";
import type { TaskNode } from "../../../../domain/models/tasks/index.js";
import { PrismaTaskMapper } from "../mappers/prisma-task.mapper.js";

export class PostgresTaskRepository implements ITaskRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaTaskMapper()
  ) {}

  async findById(id: string): Promise<TaskNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { taskDetails: true },
    });

    return row && row.nodeType === "task" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<TaskNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, userId, nodeType: "task" },
      include: { taskDetails: true },
    });

    return row ? this.mapper.toDomain(row) : null;
  }

  async listByUser(userId: string): Promise<TaskNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { userId, nodeType: "task", isDeleted: false },
      include: { taskDetails: true },
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async save(entity: TaskNode): Promise<TaskNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
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

    const saved = await this.findById(entity.id);
    if (!saved) throw new Error("Failed to save task");
    return saved;
  }

  async saveForProject(entity: TaskNode, projectId: string): Promise<TaskNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const detailsData = entity.details
      ? this.mapper.toTaskDetailsPersistence(entity.id, entity.details)
      : null;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.create({ data: nodeData });

      if (detailsData) {
        await tx.spydrTaskDetails.create({ data: detailsData });
      }

      await tx.spydrNodeRelationship.create({
        data: {
          userId: entity.userId,
          sourceNodeId: projectId,
          targetNodeId: entity.id,
          relationshipType: "related_to",
          reason: "Project task",
        },
      });
    });

    const saved = await this.findById(entity.id);
    if (!saved) throw new Error("Failed to save task");
    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.delete({ where: { id } });
  }
}
