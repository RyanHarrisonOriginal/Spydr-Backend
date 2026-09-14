import type { PrismaClient } from "@prisma/client";
import type { IIdeaViews } from "../../../domains/ideas/views.js";
import type { IdeaNode } from "../../../domains/ideas/models/index.js";
import { PrismaIdeaMapper } from "../prisma/mappers/prisma-idea.mapper.js";

export class PostgresIdeaViews implements IIdeaViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaIdeaMapper()
  ) {}

  async listByOrg(orgId: string): Promise<IdeaNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "idea", isDeleted: false },
      include: { ideaDetails: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }
}
