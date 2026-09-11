import type { PrismaClient } from "@prisma/client";
import type {
  IProjectTemplateListItem,
  IProjectTemplateViews,
} from "../../../domains/project-templates/views.js";
import type { ProjectTemplate } from "../../../domains/project-templates/models/index.js";
import {
  PrismaProjectTemplateMapper,
  type ProjectTemplateRow,
} from "./prisma-project-template.mapper.js";

export class PostgresProjectTemplateViews implements IProjectTemplateViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaProjectTemplateMapper()
  ) {}

  async listByOrg(
    orgId: string,
    options?: { includeArchived?: boolean }
  ): Promise<IProjectTemplateListItem[]> {
    const rows = await this.db.spydrProjectTemplate.findMany({
      where: {
        orgId,
        ...(options?.includeArchived ? {} : { isArchived: false }),
      },
      orderBy: [{ name: "asc" }],
      include: {
        _count: { select: { parameters: true, tasks: true } },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      isArchived: row.isArchived,
      parameterCount: row._count.parameters,
      taskCount: row._count.tasks,
      updatedAt: row.updatedAt,
    }));
  }

  async getDetail(
    orgId: string,
    templateId: string
  ): Promise<ProjectTemplate | null> {
    const row = await this.db.spydrProjectTemplate.findFirst({
      where: { id: templateId, orgId },
      include: { parameters: true, tasks: true },
    });
    return row ? this.mapper.toDomain(row as ProjectTemplateRow) : null;
  }
}
