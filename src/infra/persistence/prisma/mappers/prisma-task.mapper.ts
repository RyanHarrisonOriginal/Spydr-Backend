import type { Prisma } from "@prisma/client";
import { TaskDetails, TaskNode } from "../../../../domain/models/tasks/index.js";
import type { ITaskDetailsProps } from "../../../../domain/models/tasks/index.js";
import type { IDomainMapper } from "../../../../domain/mappers/index.js";
import { readNodeLifecycle, writeNodeLifecycle } from "./node-lifecycle.js";

export type PrismaTaskWithDetails = Prisma.SpydrNodeGetPayload<{
  include: { taskDetails: true };
}>;

export class PrismaTaskMapper
  implements
    IDomainMapper<
      PrismaTaskWithDetails,
      TaskNode,
      Prisma.SpydrNodeUncheckedCreateInput
    >
{
  toDomain(persistence: PrismaTaskWithDetails): TaskNode {
    return new TaskNode({
      id: persistence.id,
      userId: persistence.userId,
      title: persistence.title,
      body: persistence.body,
      status: persistence.status,
      priority: persistence.priority,
      area: persistence.area,
      tags: persistence.tags,
      sortOrder: persistence.sortOrder,
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt,
      archivedAt: persistence.archivedAt,
      ...readNodeLifecycle(persistence),
      details: persistence.taskDetails
        ? new TaskDetails({
            dueDate: persistence.taskDetails.dueDate,
            completedAt: persistence.taskDetails.completedAt,
            isBlocked: persistence.taskDetails.isBlocked,
            estimatedMinutes: persistence.taskDetails.estimatedMinutes,
            assigneePersonNodeId: persistence.taskDetails.assigneePersonNodeId,
            createdAt: persistence.taskDetails.createdAt,
            updatedAt: persistence.taskDetails.updatedAt,
          })
        : null,
    });
  }

  toPersistence(domain: TaskNode): Prisma.SpydrNodeUncheckedCreateInput {
    return {
      id: domain.id,
      userId: domain.userId,
      nodeType: "task",
      title: domain.title,
      body: domain.body,
      status: domain.status,
      priority: domain.priority,
      area: domain.area,
      tags: domain.tags,
      sortOrder: domain.sortOrder,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      archivedAt: domain.archivedAt,
      ...writeNodeLifecycle(domain),
    };
  }

  toTaskDetailsPersistence(
    nodeId: string,
    details: ITaskDetailsProps
  ): Prisma.SpydrTaskDetailsUncheckedCreateInput {
    return {
      nodeId,
      dueDate: details.dueDate,
      completedAt: details.completedAt,
      isBlocked: details.isBlocked,
      estimatedMinutes: details.estimatedMinutes,
      assigneePersonNodeId: details.assigneePersonNodeId,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };
  }
}
