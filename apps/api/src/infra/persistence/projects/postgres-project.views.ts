import type { PrismaClient } from "@prisma/client";
import type {
  IProjectViews,
  ISourceTemplateProject,
} from "../../../domains/projects/views.js";
import type { ProjectNode } from "../../../domains/projects/models/index.js";
import { PrismaProjectMapper } from "../prisma/mappers/prisma-project.mapper.js";
import { ProjectGraphLoaders } from "./project-graph-loaders.js";

export class PostgresProjectViews implements IProjectViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly graph = new ProjectGraphLoaders(db),
    private readonly mapper = new PrismaProjectMapper()
  ) {}

  async listByOrg(orgId: string): Promise<ProjectNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "project", isDeleted: false },
      include: { projectDetails: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    const projects = rows.map((row) => this.mapper.toDomain(row));
    return this.graph.attachAssigneesToProjects(orgId, projects);
  }

  async listDeletedByOrg(orgId: string): Promise<ProjectNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "project", isDeleted: true },
      include: { projectDetails: true },
      orderBy: { deletedAt: "desc" },
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async getById(orgId: string, projectId: string): Promise<ProjectNode | null> {
    return this.graph.getProject(orgId, projectId);
  }

  async listOpenBySourceTemplate(
    orgId: string,
    templateId: string
  ): Promise<ISourceTemplateProject[]> {
    const rows = await this.db.spydrNode.findMany({
      where: {
        orgId,
        nodeType: "project",
        isDeleted: false,
        status: { notIn: ["completed", "archived"] },
        projectDetails: {
          sourceTemplateId: templateId,
          templateSyncEnabled: true,
        },
      },
      select: { id: true, title: true },
      orderBy: [{ updatedAt: "desc" }],
    });
    return rows.map((row) => ({ id: row.id, title: row.title }));
  }
}
