import type { Prisma } from "@prisma/client";
import { ProjectDetails, ProjectNode } from "../../../../domain/models/projects/index.js";
import type { IProjectDetailsProps } from "../../../../domain/models/projects/index.js";
import type { IDomainMapper } from "../../../../domain/mappers/index.js";
import { readNodeLifecycle, writeNodeLifecycle } from "./node-lifecycle.js";

export type PrismaProjectWithDetails = Prisma.SpydrNodeGetPayload<{
  include: { projectDetails: true };
}>;

export class PrismaProjectMapper
  implements
    IDomainMapper<
      PrismaProjectWithDetails,
      ProjectNode,
      Prisma.SpydrNodeUncheckedCreateInput
    >
{
  toDomain(persistence: PrismaProjectWithDetails): ProjectNode {
    return new ProjectNode({
      id: persistence.id,
      userId: persistence.userId,
      title: persistence.title,
      body: persistence.body,
      status: persistence.status,
      priority: persistence.priority,
      area: persistence.area,
      tags: persistence.tags,
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt,
      archivedAt: persistence.archivedAt,
      ...readNodeLifecycle(persistence),
      details: persistence.projectDetails
        ? new ProjectDetails({
            outcome: persistence.projectDetails.outcome,
            startDate: persistence.projectDetails.startDate,
            targetDate: persistence.projectDetails.targetDate,
            riskLevel: persistence.projectDetails.riskLevel,
            lastActivityAt: persistence.projectDetails.lastActivityAt,
            createdAt: persistence.projectDetails.createdAt,
            updatedAt: persistence.projectDetails.updatedAt,
          })
        : null,
    });
  }

  toPersistence(domain: ProjectNode): Prisma.SpydrNodeUncheckedCreateInput {
    return {
      id: domain.id,
      userId: domain.userId,
      nodeType: "project",
      title: domain.title,
      body: domain.body,
      status: domain.status,
      priority: domain.priority,
      area: domain.area,
      tags: domain.tags,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      archivedAt: domain.archivedAt,
      ...writeNodeLifecycle(domain),
    };
  }

  toProjectDetailsPersistence(
    nodeId: string,
    details: IProjectDetailsProps
  ): Prisma.SpydrProjectDetailsUncheckedCreateInput {
    return {
      nodeId,
      outcome: details.outcome,
      startDate: details.startDate,
      targetDate: details.targetDate,
      riskLevel: details.riskLevel,
      lastActivityAt: details.lastActivityAt,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };
  }
}
