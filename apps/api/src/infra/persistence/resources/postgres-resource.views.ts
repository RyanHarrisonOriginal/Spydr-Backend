import type { PrismaClient } from "@prisma/client";
import type { IResourceViews } from "../../../domains/resources/views.js";
import type { ResourceNode } from "../../../domains/resources/models/index.js";
import { PrismaResourceMapper } from "../prisma/mappers/prisma-resource.mapper.js";

export class PostgresResourceViews implements IResourceViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaResourceMapper()
  ) {}

  async listByOrg(orgId: string): Promise<ResourceNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "resource", isDeleted: false },
      include: { resourceDetails: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }
}
