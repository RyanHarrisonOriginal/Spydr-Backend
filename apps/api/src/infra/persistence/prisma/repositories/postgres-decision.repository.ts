import type { PrismaClient } from "@prisma/client";
import type {
  IDecisionListItem,
  IDecisionRepository,
} from "../../../../domain/interfaces/index.js";
import type { ITaskProjectRef } from "../../../../domain/interfaces/task-repository.js";
import type { DecisionNode } from "../../../../domain/models/decisions/index.js";
import { PrismaDecisionMapper } from "../mappers/prisma-decision.mapper.js";

export class PostgresDecisionRepository implements IDecisionRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaDecisionMapper()
  ) {}

  async findById(id: string): Promise<DecisionNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { decisionDetails: true },
    });

    return row && row.nodeType === "decision" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForOrg(id: string, orgId: string): Promise<DecisionNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, orgId, nodeType: "decision" },
      include: { decisionDetails: true },
    });

    return row ? this.mapper.toDomain(row) : null;
  }

  async listByOrg(orgId: string): Promise<DecisionNode[]> {
    const items = await this.listByOrgWithProjects(orgId);
    return items.map((item) => item.decision);
  }

  async listByOrgWithProjects(orgId: string): Promise<IDecisionListItem[]> {
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
      projectRows.map((project) => [project.id, { id: project.id, title: project.title }])
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

  async save(entity: DecisionNode): Promise<DecisionNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (!entity.details) return;

      const detailsData = this.mapper.toDecisionDetailsPersistence(
        entity.id,
        entity.details
      );
      const { nodeId, ...detailsUpdateData } = detailsData;

      await tx.spydrDecisionDetails.upsert({
        where: { nodeId },
        create: detailsData,
        update: detailsUpdateData,
      });
    });

    const saved = await this.findById(entity.id);
    if (!saved) throw new Error("Failed to save decision");
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
