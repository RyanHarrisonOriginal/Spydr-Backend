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
      orgId: persistence.orgId,
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
      details: persistence.projectDetails
        ? new ProjectDetails({
            outcome: persistence.projectDetails.outcome,
            startDate: persistence.projectDetails.startDate,
            targetDate: persistence.projectDetails.targetDate,
            riskLevel: persistence.projectDetails.riskLevel,
            lastActivityAt: persistence.projectDetails.lastActivityAt,
            requesterPersonNodeId: persistence.projectDetails.requesterPersonNodeId,
            assigneePersonNodeId: persistence.projectDetails.assigneePersonNodeId,
            sponsorPersonNodeId: persistence.projectDetails.sponsorPersonNodeId,
            reviewerPersonNodeId: persistence.projectDetails.reviewerPersonNodeId,
            createdAt: persistence.projectDetails.createdAt,
            updatedAt: persistence.projectDetails.updatedAt,
          })
        : null,
    });
  }

  toPersistence(domain: ProjectNode): Prisma.SpydrNodeUncheckedCreateInput {
    return {
      id: domain.id,
      orgId: domain.orgId,
      userId: domain.userId,
      nodeType: "project",
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
      requesterPersonNodeId: details.requesterPersonNodeId,
      assigneePersonNodeId: details.assigneePersonNodeId,
      sponsorPersonNodeId: details.sponsorPersonNodeId,
      reviewerPersonNodeId: details.reviewerPersonNodeId,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };
  }
}
