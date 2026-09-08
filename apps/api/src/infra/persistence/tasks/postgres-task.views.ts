import type { PrismaClient } from "@prisma/client";
import type {
  ITaskListItem,
  ITaskProjectRef,
  ITaskViews,
} from "../../../domains/tasks/views.js";
import type { TaskNode } from "../../../domains/tasks/models/index.js";
import type { PersonNode } from "../../../domains/people/models/index.js";
import { PrismaTaskMapper } from "../prisma/mappers/prisma-task.mapper.js";
import { PrismaPersonMapper } from "../prisma/mappers/prisma-person.mapper.js";

export class PostgresTaskViews implements ITaskViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaTaskMapper(),
    private readonly personMapper = new PrismaPersonMapper()
  ) {}

  async listByOrg(orgId: string): Promise<ITaskListItem[]> {
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
      projectRows.map((project) => [
        project.id,
        { id: project.id, title: project.title },
      ])
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

  async getListItem(
    orgId: string,
    taskId: string
  ): Promise<ITaskListItem | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id: taskId, orgId, nodeType: "task", isDeleted: false },
      include: { taskDetails: true },
    });
    if (!row) return null;

    const task = await this.attachAssignee(orgId, this.mapper.toDomain(row));
    return {
      task,
      project: await this.findProjectForTask(orgId, taskId),
    };
  }

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
        id: { in: relationships.map((r) => r.sourceNodeId) },
        nodeType: "project",
        isDeleted: false,
      },
      select: { id: true, title: true },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return project ? { id: project.id, title: project.title } : null;
  }
}
