import type { PrismaClient } from "@prisma/client";
import { TaskMapper } from "../../../../domain/mappers/tasks/index.js";
import type {
  ITaskListItem,
  ITaskProjectRef,
  ITaskRepository,
} from "../../../../domain/interfaces/task-repository.js";
import type { ITaskUpdateModelInput } from "../../../../domain/mappers/tasks/index.js";
import type { TaskNode } from "../../../../domain/models/tasks/index.js";
import { PrismaTaskMapper } from "../mappers/prisma-task.mapper.js";

export class PostgresTaskRepository implements ITaskRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaTaskMapper(),
    private readonly domainMapper = new TaskMapper()
  ) {}

  async findById(id: string): Promise<TaskNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { taskDetails: true },
    });

    return row && row.nodeType === "task" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<TaskNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, userId, nodeType: "task" },
      include: { taskDetails: true },
    });

    return row ? this.mapper.toDomain(row) : null;
  }

  async listByUser(userId: string): Promise<TaskNode[]> {
    const items = await this.listByUserWithProjects(userId);
    return items.map((item) => item.task);
  }

  async listByUserWithProjects(userId: string): Promise<ITaskListItem[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { userId, nodeType: "task", isDeleted: false },
      include: { taskDetails: true },
      orderBy: { updatedAt: "desc" },
    });

    if (rows.length === 0) return [];

    const tasks = rows.map((row) => this.mapper.toDomain(row));
    const taskIds = tasks.map((task) => task.id);
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        userId,
        targetNodeId: { in: taskIds },
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
              userId,
              id: { in: projectIds },
              nodeType: "project",
              isDeleted: false,
            },
            select: { id: true, title: true },
          });

    const projectById = new Map<string, ITaskProjectRef>(
      projectRows.map((project) => [project.id, { id: project.id, title: project.title }])
    );
    const projectByTaskId = new Map<string, ITaskProjectRef>();

    for (const relationship of relationships) {
      const project = projectById.get(relationship.sourceNodeId);
      if (project) {
        projectByTaskId.set(relationship.targetNodeId, project);
      }
    }

    return tasks.map((task) => ({
      task,
      project: projectByTaskId.get(task.id) ?? null,
    }));
  }

  async updateForUser(
    userId: string,
    taskId: string,
    input: ITaskUpdateModelInput
  ): Promise<TaskNode | null> {
    const existing = await this.findByIdForUser(taskId, userId);
    if (!existing || existing.isDeleted) return null;

    const updated = this.domainMapper.updateToModel(existing, input);
    return this.save(updated);
  }

  async assignToProject(
    userId: string,
    taskId: string,
    projectId: string | null
  ): Promise<ITaskListItem | null> {
    const task = await this.findByIdForUser(taskId, userId);
    if (!task || task.isDeleted) return null;

    if (projectId) {
      const project = await this.db.spydrNode.findFirst({
        where: {
          id: projectId,
          userId,
          nodeType: "project",
          isDeleted: false,
        },
        select: { id: true, title: true },
      });
      if (!project) return null;
    }

    await this.db.$transaction(async (tx) => {
      const relationships = await tx.spydrNodeRelationship.findMany({
        where: {
          userId,
          targetNodeId: taskId,
          relationshipType: "related_to",
        },
        select: { sourceNodeId: true },
      });

      if (relationships.length > 0) {
        const sourceIds = relationships.map((relationship) => relationship.sourceNodeId);
        const projectSources = await tx.spydrNode.findMany({
          where: {
            userId,
            id: { in: sourceIds },
            nodeType: "project",
          },
          select: { id: true },
        });
        const projectSourceIds = new Set(projectSources.map((node) => node.id));

        for (const relationship of relationships) {
          if (!projectSourceIds.has(relationship.sourceNodeId)) continue;
          await tx.spydrNodeRelationship.deleteMany({
            where: {
              userId,
              sourceNodeId: relationship.sourceNodeId,
              targetNodeId: taskId,
              relationshipType: "related_to",
            },
          });
        }
      }

      if (projectId) {
        await tx.spydrNodeRelationship.create({
          data: {
            userId,
            sourceNodeId: projectId,
            targetNodeId: taskId,
            relationshipType: "related_to",
            reason: "Project task",
          },
        });
      }
    });

    return this.getListItemForUser(userId, taskId);
  }

  async getListItemForUser(
    userId: string,
    taskId: string
  ): Promise<ITaskListItem | null> {
    const task = await this.findByIdForUser(taskId, userId);
    if (!task || task.isDeleted) return null;

    return {
      task,
      project: await this.findProjectForTask(userId, taskId),
    };
  }

  private async findProjectForTask(
    userId: string,
    taskId: string
  ): Promise<ITaskProjectRef | null> {
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        userId,
        targetNodeId: taskId,
        relationshipType: "related_to",
      },
      select: { sourceNodeId: true },
    });

    if (relationships.length === 0) return null;

    const project = await this.db.spydrNode.findFirst({
      where: {
        userId,
        id: { in: relationships.map((relationship) => relationship.sourceNodeId) },
        nodeType: "project",
        isDeleted: false,
      },
      select: { id: true, title: true },
      orderBy: { updatedAt: "desc" },
    });

    return project ? { id: project.id, title: project.title } : null;
  }

  async save(entity: TaskNode): Promise<TaskNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (!entity.details) return;

      const detailsData = this.mapper.toTaskDetailsPersistence(
        entity.id,
        entity.details
      );
      const { nodeId, ...detailsUpdateData } = detailsData;

      await tx.spydrTaskDetails.upsert({
        where: { nodeId },
        create: detailsData,
        update: detailsUpdateData,
      });
    });

    const saved = await this.findById(entity.id);
    if (!saved) throw new Error("Failed to save task");
    return saved;
  }

  async saveForProject(entity: TaskNode, projectId: string): Promise<TaskNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const detailsData = entity.details
      ? this.mapper.toTaskDetailsPersistence(entity.id, entity.details)
      : null;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.create({ data: nodeData });

      if (detailsData) {
        await tx.spydrTaskDetails.create({ data: detailsData });
      }

      await tx.spydrNodeRelationship.create({
        data: {
          userId: entity.userId,
          sourceNodeId: projectId,
          targetNodeId: entity.id,
          relationshipType: "related_to",
          reason: "Project task",
        },
      });
    });

    const saved = await this.findById(entity.id);
    if (!saved) throw new Error("Failed to save task");
    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.delete({ where: { id } });
  }
}
