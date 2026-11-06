import type { PrismaClient } from "@prisma/client";
import type {
  IIdeaListItem,
  IIdeaProjectRef,
  IIdeaViews,
} from "../../../domains/ideas/views.js";
import { PrismaIdeaMapper } from "../prisma/mappers/prisma-idea.mapper.js";

export class PostgresIdeaViews implements IIdeaViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaIdeaMapper()
  ) {}

  async listByOrg(orgId: string): Promise<IIdeaListItem[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "idea", isDeleted: false },
      include: { ideaDetails: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    if (rows.length === 0) return [];

    const ideas = rows.map((row) => this.mapper.toDomain(row));
    const ideaIds = ideas.map((idea) => idea.id);
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        orgId,
        targetNodeId: { in: ideaIds },
        relationshipType: "related_to",
      },
      select: { sourceNodeId: true, targetNodeId: true },
    });

    const projectIds = Array.from(
      new Set(relationships.map((relationship) => relationship.sourceNodeId))
    );
    const projectRows =
      projectIds.length === 0
        ? []
        : await this.db.spydrNode.findMany({
            where: {
              orgId,
              id: { in: projectIds },
              nodeType: "project",
              isDeleted: false,
            },
            select: { id: true, title: true },
          });

    const projectById = new Map<string, IIdeaProjectRef>(
      projectRows.map((project) => [
        project.id,
        { id: project.id, title: project.title },
      ])
    );
    const projectByIdeaId = new Map<string, IIdeaProjectRef>();

    for (const relationship of relationships) {
      const project = projectById.get(relationship.sourceNodeId);
      if (project) {
        projectByIdeaId.set(relationship.targetNodeId, project);
      }
    }

    return ideas.map((idea) => ({
      idea,
      project: projectByIdeaId.get(idea.id) ?? null,
    }));
  }
}
