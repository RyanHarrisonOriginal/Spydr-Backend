import type { Prisma, PrismaClient } from "@prisma/client";
import type { IProjectRepository } from "../../../../domain/interfaces/index.js";
import { IdeaDetails, IdeaNode } from "../../../../domain/models/ideas/index.js";
import { ProjectNode } from "../../../../domain/models/projects/index.js";
import { PrismaProjectMapper } from "../mappers/prisma-project.mapper.js";
import { PrismaDecisionMapper } from "../mappers/prisma-decision.mapper.js";
import { PrismaNoteMapper } from "../mappers/prisma-note.mapper.js";
import { PrismaResourceMapper } from "../mappers/prisma-resource.mapper.js";
import { PrismaTaskMapper } from "../mappers/prisma-task.mapper.js";

export class PostgresProjectRepository implements IProjectRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaProjectMapper(),
    private readonly taskMapper = new PrismaTaskMapper(),
    private readonly decisionMapper = new PrismaDecisionMapper(),
    private readonly noteMapper = new PrismaNoteMapper(),
    private readonly resourceMapper = new PrismaResourceMapper()
  ) {}

  async findById(id: string): Promise<ProjectNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { projectDetails: true },
    });

    return row && row.nodeType === "project" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<ProjectNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, userId, nodeType: "project" },
      include: { projectDetails: true },
    });

    if (!row) return null;

    const project = this.mapper.toDomain(row);
    const related = await this.loadRelatedNodes(id, userId);

    return new ProjectNode({
      id: project.id,
      userId: project.userId,
      title: project.title,
      body: project.body,
      status: project.status,
      priority: project.priority,
      area: project.area,
      tags: project.tags,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      archivedAt: project.archivedAt,
      details: project.details,
      ...related,
    });
  }

  async listByUser(userId: string): Promise<ProjectNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { userId, nodeType: "project" },
      include: { projectDetails: true },
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async save(entity: ProjectNode): Promise<ProjectNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (entity.details) {
        const detailsData = this.mapper.toProjectDetailsPersistence(
          entity.id,
          entity.details
        );
        const { nodeId, ...detailsUpdateData } = detailsData;

        await tx.spydrProjectDetails.upsert({
          where: { nodeId },
          create: detailsData,
          update: detailsUpdateData,
        });
      }

      for (const task of entity.tasks) {
        const taskData = this.taskMapper.toPersistence(task);
        const { id: taskId, ...taskUpdateData } = taskData;

        await tx.spydrNode.upsert({
          where: { id: taskId },
          create: taskData,
          update: taskUpdateData,
        });

        if (task.details) {
          const taskDetailsData = this.taskMapper.toTaskDetailsPersistence(
            task.id,
            task.details
          );
          const { nodeId, ...taskDetailsUpdateData } = taskDetailsData;

          await tx.spydrTaskDetails.upsert({
            where: { nodeId },
            create: taskDetailsData,
            update: taskDetailsUpdateData,
          });
        }

        await tx.spydrNodeRelationship.deleteMany({
          where: {
            userId: entity.userId,
            sourceNodeId: entity.id,
            targetNodeId: task.id,
            relationshipType: "related_to",
          },
        });
        await tx.spydrNodeRelationship.create({
          data: {
            userId: entity.userId,
            sourceNodeId: entity.id,
            targetNodeId: task.id,
            relationshipType: "related_to",
            reason: "Project task",
          },
        });
      }
    });

    const saved = await this.findById(entity.id);
    if (!saved) {
      throw new Error("Failed to save project");
    }

    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.delete({ where: { id } });
  }

  private async loadRelatedNodes(projectId: string, userId: string) {
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        userId,
        OR: [{ sourceNodeId: projectId }, { targetNodeId: projectId }],
      },
    });

    const relatedIds = relationships.map((relationship) =>
      relationship.sourceNodeId === projectId
        ? relationship.targetNodeId
        : relationship.sourceNodeId
    );

    if (relatedIds.length === 0) {
      return {
        tasks: [],
        decisions: [],
        ideas: [],
        notes: [],
        resources: [],
      };
    }

    const rows = await this.db.spydrNode.findMany({
      where: {
        userId,
        id: { in: relatedIds },
        nodeType: { in: ["task", "decision", "idea", "note", "resource"] },
      },
      include: {
        taskDetails: true,
        decisionDetails: true,
        ideaDetails: true,
        resourceDetails: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    return {
      tasks: rows
        .filter((row) => row.nodeType === "task")
        .map((row) => this.taskMapper.toDomain(row)),
      decisions: rows
        .filter((row) => row.nodeType === "decision")
        .map((row) => this.decisionMapper.toDomain(row)),
      ideas: rows
        .filter((row) => row.nodeType === "idea")
        .map((row) => this.toIdea(row)),
      notes: rows
        .filter((row) => row.nodeType === "note")
        .map((row) => this.noteMapper.toDomain(row)),
      resources: rows
        .filter((row) => row.nodeType === "resource")
        .map((row) => this.resourceMapper.toDomain(row)),
    };
  }

  private toIdea(
    row: Prisma.SpydrNodeGetPayload<{ include: { ideaDetails: true } }>
  ): IdeaNode {
    return new IdeaNode({
      id: row.id,
      userId: row.userId,
      title: row.title,
      body: row.body,
      status: row.status,
      priority: row.priority,
      area: row.area,
      tags: row.tags,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      archivedAt: row.archivedAt,
      details: row.ideaDetails
        ? new IdeaDetails({
            confidence: row.ideaDetails.confidence
              ? Number(row.ideaDetails.confidence)
              : null,
            potentialValue: row.ideaDetails.potentialValue,
            promotedToProjectNodeId: row.ideaDetails.promotedToProjectNodeId,
            createdAt: row.ideaDetails.createdAt,
            updatedAt: row.ideaDetails.updatedAt,
          })
        : null,
    });
  }
}
