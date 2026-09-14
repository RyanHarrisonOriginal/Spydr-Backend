import type { PrismaClient } from "@prisma/client";
import type {
  IDecisionListItem,
  IDecisionViews,
} from "../../../domains/decisions/views.js";
import type { ITaskProjectRef } from "../../../domains/tasks/views.js";
import { PrismaDecisionMapper } from "../prisma/mappers/prisma-decision.mapper.js";

export class PostgresDecisionViews implements IDecisionViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaDecisionMapper()
  ) {}

  async listByOrg(orgId: string): Promise<IDecisionListItem[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "decision", isDeleted: false },
      include: { decisionDetails: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    if (rows.length === 0) return [];

    const decisions = rows.map((row) => this.mapper.toDomain(row));
    const decisionIds = decisions.map((decision) => decision.id);
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        orgId,
        relationshipType: "related_to",
        OR: [
          { targetNodeId: { in: decisionIds } },
          { sourceNodeId: { in: decisionIds } },
        ],
      },
      select: { sourceNodeId: true, targetNodeId: true, reason: true },
    });

    const decisionIdSet = new Set(decisionIds);
    const linkedProjectIds = new Set<string>();

    for (const relationship of relationships) {
      const decisionIsTarget = decisionIdSet.has(relationship.targetNodeId);
      const decisionIsSource = decisionIdSet.has(relationship.sourceNodeId);
      if (!decisionIsTarget && !decisionIsSource) continue;

      const projectNodeId = decisionIsTarget
        ? relationship.sourceNodeId
        : relationship.targetNodeId;
      linkedProjectIds.add(projectNodeId);
    }

    const projectIds = Array.from(linkedProjectIds);
    const projectRows =
      projectIds.length === 0
        ? []
        : await this.db.spydrNode.findMany({
            where: {
              orgId,
              id: { in: projectIds },
              nodeType: "project",
            },
            select: { id: true, title: true },
          });

    const projectById = new Map<string, ITaskProjectRef>(
      projectRows.map((project) => [
        project.id,
        { id: project.id, title: project.title },
      ])
    );
    const projectByDecisionId = new Map<string, ITaskProjectRef>();

    for (const relationship of relationships) {
      const decisionIsTarget = decisionIdSet.has(relationship.targetNodeId);
      const decisionIsSource = decisionIdSet.has(relationship.sourceNodeId);
      if (!decisionIsTarget && !decisionIsSource) continue;

      const decisionId = decisionIsTarget
        ? relationship.targetNodeId
        : relationship.sourceNodeId;
      const projectNodeId = decisionIsTarget
        ? relationship.sourceNodeId
        : relationship.targetNodeId;
      const project = projectById.get(projectNodeId);
      if (project) {
        projectByDecisionId.set(decisionId, project);
      }
    }

    return decisions.map((decision) => ({
      decision,
      project: projectByDecisionId.get(decision.id) ?? null,
    }));
  }
}
