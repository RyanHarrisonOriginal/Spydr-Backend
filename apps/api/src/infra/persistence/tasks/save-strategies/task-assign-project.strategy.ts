import type { PrismaClient } from "@prisma/client";
import type { ISaveStrategy } from "../../../../domains/shared/save-strategy.js";
import type { ITaskAssignProjectContext } from "../../../../domains/tasks/repository.js";
import type { TaskNode } from "../../../../domains/tasks/models/index.js";
import { PrismaTaskMapper } from "../../prisma/mappers/prisma-task.mapper.js";

/**
 * Reassigns the task's project relationship. Entity is used for identity/userId;
 * context carries orgId and target projectId (null clears assignment).
 */
export class TaskAssignProjectSaveStrategy
  implements ISaveStrategy<TaskNode, ITaskAssignProjectContext>
{
  readonly key = "assignProject";

  constructor(private readonly mapper = new PrismaTaskMapper()) {}

  async save(
    entity: TaskNode,
    context: ITaskAssignProjectContext | undefined,
    db: PrismaClient
  ): Promise<TaskNode> {
    if (!context) {
      throw new Error("assignProject strategy requires context");
    }

    const { orgId, projectId } = context;
    const taskId = entity.id;

    if (projectId) {
      const project = await db.spydrNode.findFirst({
        where: {
          id: projectId,
          orgId,
          nodeType: "project",
          isDeleted: false,
        },
        select: { id: true },
      });
      if (!project) {
        throw new Error("Project not found");
      }
    }

    await db.$transaction(async (tx) => {
      const relationships = await tx.spydrNodeRelationship.findMany({
        where: {
          orgId,
          targetNodeId: taskId,
          relationshipType: "related_to",
        },
        select: { sourceNodeId: true },
      });

      if (relationships.length > 0) {
        const sourceIds = relationships.map((r) => r.sourceNodeId);
        const projectSources = await tx.spydrNode.findMany({
          where: {
            orgId,
            id: { in: sourceIds },
            nodeType: "project",
          },
          select: { id: true },
        });
        const projectSourceIds = new Set(projectSources.map((n) => n.id));

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
            userId: entity.userId,
            sourceNodeId: projectId,
            targetNodeId: taskId,
            relationshipType: "related_to",
            reason: "Project task",
          },
        });
      }
    });

    const row = await db.spydrNode.findFirst({
      where: { id: taskId, orgId, nodeType: "task" },
      include: { taskDetails: true },
    });
    if (!row) {
      throw new Error("Failed to assign task to project");
    }
    return this.mapper.toDomain(row);
  }
}
