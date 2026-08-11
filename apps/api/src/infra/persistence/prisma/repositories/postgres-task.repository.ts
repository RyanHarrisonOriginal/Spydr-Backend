import type { PrismaClient } from "@prisma/client";
import { TaskMapper } from "../../../../domain/mappers/tasks/index.js";
import type {
  ITaskListItem,
  ITaskProjectRef,
  ITaskRepository,
} from "../../../../domain/interfaces/task-repository.js";
import type { ITaskUpdateModelInput } from "../../../../domain/mappers/tasks/index.js";
import type { TaskNode } from "../../../../domain/models/tasks/index.js";
import type { PersonNode } from "../../../../domain/models/people/index.js";
import { PrismaTaskMapper } from "../mappers/prisma-task.mapper.js";
import { PrismaPersonMapper } from "../mappers/prisma-person.mapper.js";

export class PostgresTaskRepository implements ITaskRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaTaskMapper(),
    private readonly domainMapper = new TaskMapper(),
    private readonly personMapper = new PrismaPersonMapper()
  ) {}

  private async attachAssignees(
    orgId: string,
    tasks: TaskNode[]
  ): Promise<TaskNode[]> {
    const assigneeIds = [
      ...new Set(
        tasks
          .map((task) => task.details?.assigneePersonNodeId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    if (assigneeIds.length === 0) return tasks;

    const rows = await this.db.spydrNode.findMany({
      where: {
        id: { in: assigneeIds },
        orgId,
        nodeType: "person",
        isDeleted: false,
      },
      include: { personDetails: true },
    });

    const assigneeById = new Map<string, PersonNode>(
      rows.map((row) => [row.id, this.personMapper.toDomain(row)])
    );

    return tasks.map((task) => {
      const assigneeId = task.details?.assigneePersonNodeId ?? null;
      if (!assigneeId) return task;
      return task.withAssignee(assigneeById.get(assigneeId) ?? null);
    });
  }

  private async attachAssignee(
    orgId: string,
    task: TaskNode
  ): Promise<TaskNode> {
    const [hydrated] = await this.attachAssignees(orgId, [task]);
    return hydrated ?? task;
  }

  async findById(id: string): Promise<TaskNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { taskDetails: true },
    });

    return row && row.nodeType === "task" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForOrg(id: string, orgId: string): Promise<TaskNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, orgId, nodeType: "task" },
      include: { taskDetails: true },
    });

    return row ? this.mapper.toDomain(row) : null;
  }

  async listByOrg(orgId: string): Promise<TaskNode[]> {
    const items = await this.listByOrgWithProjects(orgId);
    return items.map((item) => item.task);
  }

  async listByOrgWithProjects(orgId: string): Promise<ITaskListItem[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "task", isDeleted: false },
      include: { taskDetails: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    if (rows.length === 0) return [];

    const tasks = await this.attachAssignees(
      orgId,
      rows.map((row) => this.mapper.toDomain(row))
    );
    const taskIds = tasks.map((task) => task.id);
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        orgId,
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
              orgId,
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

  async updateForOrg(
    orgId: string,
    taskId: string,
    input: ITaskUpdateModelInput
  ): Promise<TaskNode | null> {
    const existing = await this.findByIdForOrg(taskId, orgId);
    if (!existing || existing.isDeleted) return null;

    const updated = this.domainMapper.updateToModel(existing, input);
    return this.save(updated);
  }

  async assignToProject(
    orgId: string,
    taskId: string,
    projectId: string | null
  ): Promise<ITaskListItem | null> {
    const task = await this.findByIdForOrg(taskId, orgId);
    if (!task || task.isDeleted) return null;

    if (projectId) {
      const project = await this.db.spydrNode.findFirst({
        where: {
          id: projectId,
          orgId,
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
          orgId,
          targetNodeId: taskId,
          relationshipType: "related_to",
        },
        select: { sourceNodeId: true },
      });

      if (relationships.length > 0) {
        const sourceIds = relationships.map((relationship) => relationship.sourceNodeId);
        const projectSources = await tx.spydrNode.findMany({
          where: {
            orgId,
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
              orgId,
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
            orgId,
            userId: task.userId,
            sourceNodeId: projectId,
            targetNodeId: taskId,
            relationshipType: "related_to",
            reason: "Project task",
          },
        });
      }
    });

    return this.getListItemForOrg(orgId, taskId);
  }

  async getListItemForOrg(
    orgId: string,
    taskId: string
  ): Promise<ITaskListItem | null> {
    const task = await this.findByIdForOrg(taskId, orgId);
    if (!task || task.isDeleted) return null;

    return {
      task: await this.attachAssignee(orgId, task),
      project: await this.findProjectForTask(orgId, taskId),
    };
  }

  private async findProjectForTask(
    orgId: string,
    taskId: string
  ): Promise<ITaskProjectRef | null> {
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        orgId,
        targetNodeId: taskId,
        relationshipType: "related_to",
      },
      select: { sourceNodeId: true },
    });

    if (relationships.length === 0) return null;

    const project = await this.db.spydrNode.findFirst({
      where: {
        orgId,
        id: { in: relationships.map((relationship) => relationship.sourceNodeId) },
        nodeType: "project",
        isDeleted: false,
      },
      select: { id: true, title: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
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
          orgId: entity.orgId,
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
