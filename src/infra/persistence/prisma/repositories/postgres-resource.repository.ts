import type { PrismaClient } from "@prisma/client";
import type { IResourceRepository } from "../../../../domain/interfaces/index.js";
import type { ResourceNode } from "../../../../domain/models/resources/index.js";
import { PrismaResourceMapper } from "../mappers/prisma-resource.mapper.js";

export class PostgresResourceRepository implements IResourceRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaResourceMapper()
  ) {}

  async findById(id: string): Promise<ResourceNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { resourceDetails: true },
    });

    return row && row.nodeType === "resource" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<ResourceNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, userId, nodeType: "resource" },
      include: { resourceDetails: true },
    });

    return row ? this.mapper.toDomain(row) : null;
  }

  async listByUser(userId: string): Promise<ResourceNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { userId, nodeType: "resource", isDeleted: false },
      include: { resourceDetails: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async save(entity: ResourceNode): Promise<ResourceNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (!entity.details) return;

      const detailsData = this.mapper.toResourceDetailsPersistence(
        entity.id,
        entity.details
      );
      const { nodeId, ...detailsUpdateData } = detailsData;

      await tx.spydrResourceDetails.upsert({
        where: { nodeId },
        create: detailsData,
        update: detailsUpdateData,
      });
    });

    const saved = await this.findById(entity.id);
    if (!saved) throw new Error("Failed to save resource");
    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.delete({ where: { id } });
  }
}
