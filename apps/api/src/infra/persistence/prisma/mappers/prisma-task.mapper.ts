import type { Prisma } from "@prisma/client";
import { TaskDetails, TaskNode } from "../../../../domains/tasks/models/index.js";
import type { ITaskDetailsProps } from "../../../../domains/tasks/models/index.js";
import type { IDomainMapper } from "../../../../domains/shared/mappers/mapper.js";
import { readNodeLifecycle } from "./node-lifecycle.js";
import { toSpydrNodePersistence } from "./spydr-node-write.js";

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
      orgId: persistence.orgId,
      userId: persistence.userId,
      personId: persistence.personId,
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
            assigneePersonNodeId: persistence.taskDetails.assigneePersonId,
            tags: persistence.taskDetails.tags,
            sourceTemplateTaskId: persistence.taskDetails.sourceTemplateTaskId,
            createdAt: persistence.taskDetails.createdAt,
            updatedAt: persistence.taskDetails.updatedAt,
          })
        : null,
    });
  }

  toPersistence(domain: TaskNode): Prisma.SpydrNodeUncheckedCreateInput {
    return toSpydrNodePersistence(domain, "task");
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
      assigneePersonId: details.assigneePersonNodeId,
      tags: details.tags,
      sourceTemplateTaskId: details.sourceTemplateTaskId,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };
  }
}
