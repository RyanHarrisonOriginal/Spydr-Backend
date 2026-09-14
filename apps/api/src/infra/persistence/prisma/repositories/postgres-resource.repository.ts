import type { PrismaClient } from "@prisma/client";
import type { IResourceRepository } from "../../../../domains/index.js";
import type { ResourceNode } from "../../../../domains/resources/models/index.js";
import { PrismaResourceMapper } from "../mappers/prisma-resource.mapper.js";
import { withNodePersonId } from "../mappers/spydr-node-write.js";

export class PostgresResourceRepository implements IResourceRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaResourceMapper()
  ) {}

  async get(criteria: { id: string; orgId?: string; includeDeleted?: boolean }) {
    if (criteria.orgId) {
      return this.findByIdForOrg(criteria.id, criteria.orgId);
    }
    return this.findById(criteria.id);
  }

  async save(entity: ResourceNode): Promise<ResourceNode> {
    const nodeData = await withNodePersonId(this.db, this.mapper.toPersistence(entity));
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

  private async findById(id: string): Promise<ResourceNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { resourceDetails: true },
    });

    return row && row.nodeType === "resource" ? this.mapper.toDomain(row) : null;
  }

  private async findByIdForOrg(
    id: string,
    orgId: string
  ): Promise<ResourceNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, orgId, nodeType: "resource" },
      include: { resourceDetails: true },
    });

    return row ? this.mapper.toDomain(row) : null;
  }
}
