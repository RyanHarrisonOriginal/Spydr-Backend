import type { PrismaClient } from "@prisma/client";
import type { IProjectAreaViews } from "../../../domains/project-areas/views.js";
import type { ProjectAreaNode } from "../../../domains/project-areas/models/index.js";
import { PrismaProjectAreaMapper } from "../prisma/mappers/prisma-project-area.mapper.js";

const projectAreaInclude = { projectAreaDetails: true } as const;

export class PostgresProjectAreaViews implements IProjectAreaViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaProjectAreaMapper()
  ) {}

  async listByOrg(orgId: string): Promise<ProjectAreaNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "project_area", isDeleted: false },
      include: projectAreaInclude,
      orderBy: { title: "asc" },
    });
    return rows.map((row) => this.mapper.toDomain(row));
  }

  async getByTitle(
    orgId: string,
    title: string
  ): Promise<ProjectAreaNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: {
        orgId,
        nodeType: "project_area",
        isDeleted: false,
        title: { equals: title, mode: "insensitive" },
      },
      include: projectAreaInclude,
    });
    return row ? this.mapper.toDomain(row) : null;
  }
}
