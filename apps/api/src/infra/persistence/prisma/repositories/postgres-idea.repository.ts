import type { PrismaClient } from "@prisma/client";
import type { IIdeaRepository } from "../../../../domains/index.js";
import type { IdeaNode } from "../../../../domains/ideas/models/index.js";
import { PrismaIdeaMapper } from "../mappers/prisma-idea.mapper.js";

export class PostgresIdeaRepository implements IIdeaRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaIdeaMapper()
  ) {}

  async findById(id: string): Promise<IdeaNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { ideaDetails: true },
    });

    return row && row.nodeType === "idea" ? this.mapper.toDomain(row) : null;
  }

  async get(criteria: { id: string; orgId?: string; includeDeleted?: boolean }) {
    if (criteria.orgId) {
      return this.findByIdForOrg(criteria.id, criteria.orgId);
    }
    return this.findById(criteria.id);
  }

  async findByIdForOrg(id: string, orgId: string): Promise<IdeaNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, orgId, nodeType: "idea" },
      include: { ideaDetails: true },
    });

    return row ? this.mapper.toDomain(row) : null;
  }

  async listByOrg(orgId: string): Promise<IdeaNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "idea", isDeleted: false },
      include: { ideaDetails: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async save(entity: IdeaNode): Promise<IdeaNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (!entity.details) return;

      const detailsData = this.mapper.toIdeaDetailsPersistence(
        entity.id,
        entity.details
      );
      const { nodeId, ...detailsUpdateData } = detailsData;

      await tx.spydrIdeaDetails.upsert({
        where: { nodeId },
        create: detailsData,
        update: detailsUpdateData,
      });
    });

    const saved = await this.findById(entity.id);
    if (!saved) throw new Error("Failed to save idea");
    return saved;
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
