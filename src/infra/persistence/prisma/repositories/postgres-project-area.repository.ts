import type { PrismaClient } from "@prisma/client";
import type { IProjectAreaRepository } from "../../../../domain/interfaces/project-area-repository.js";
import type { ProjectAreaNode } from "../../../../domain/models/project-areas/index.js";
import { PrismaProjectAreaMapper } from "../mappers/prisma-project-area.mapper.js";

const projectAreaInclude = { projectAreaDetails: true } as const;

export class PostgresProjectAreaRepository implements IProjectAreaRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaProjectAreaMapper()
  ) {}

  async findById(id: string): Promise<ProjectAreaNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: projectAreaInclude,
    });
    return row && row.nodeType === "project_area"
      ? this.mapper.toDomain(row)
      : null;
  }

  async findByIdForUser(
    id: string,
    userId: string
  ): Promise<ProjectAreaNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, userId, nodeType: "project_area", isDeleted: false },
      include: projectAreaInclude,
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async findByTitleForUser(
    userId: string,
    title: string
  ): Promise<ProjectAreaNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: {
        userId,
        nodeType: "project_area",
        isDeleted: false,
        title: { equals: title, mode: "insensitive" },
      },
      include: projectAreaInclude,
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async listByUser(userId: string): Promise<ProjectAreaNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { userId, nodeType: "project_area", isDeleted: false },
      include: projectAreaInclude,
      orderBy: { title: "asc" },
    });
    return rows.map((row) => this.mapper.toDomain(row));
  }

  async save(entity: ProjectAreaNode): Promise<ProjectAreaNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (entity.details) {
        const detailsData = this.mapper.toProjectAreaDetailsPersistence(
          entity.id,
          entity.details
        );
        const { nodeId, ...detailsUpdateData } = detailsData;

        await tx.spydrProjectAreaDetails.upsert({
          where: { nodeId },
          create: detailsData,
          update: detailsUpdateData,
        });
      }
    });

    const saved = await this.findByIdForUser(entity.id, entity.userId);
    if (!saved) {
      throw new Error("Failed to load saved project area");
    }
    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.delete({ where: { id } });
  }

  async clearProjectsUsingArea(userId: string, areaTitle: string): Promise<void> {
    await this.db.spydrNode.updateMany({
      where: {
        userId,
        nodeType: "project",
        area: { equals: areaTitle, mode: "insensitive" },
      },
      data: {
        area: null,
        updatedAt: new Date(),
      },
    });
  }
}
