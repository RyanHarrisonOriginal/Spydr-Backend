import type { Prisma } from "@prisma/client";
import { ProjectDetails, ProjectNode } from "../../../../domains/projects/models/index.js";
import type { IProjectDetailsProps } from "../../../../domains/projects/models/index.js";
import type { IDomainMapper } from "../../../../domains/shared/mappers/mapper.js";
import { readNodeLifecycle } from "./node-lifecycle.js";
import { toSpydrNodePersistence } from "./spydr-node-write.js";

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
      details: persistence.projectDetails
        ? new ProjectDetails({
            emoji: persistence.projectDetails.emoji,
            outcome: persistence.projectDetails.outcome,
            startDate: persistence.projectDetails.startDate,
            targetDate: persistence.projectDetails.targetDate,
            riskLevel: persistence.projectDetails.riskLevel,
            lastActivityAt: persistence.projectDetails.lastActivityAt,
            requesterPersonNodeId: persistence.projectDetails.requesterPersonId,
            assigneePersonNodeId: persistence.projectDetails.assigneePersonId,
            sponsorPersonNodeId: persistence.projectDetails.sponsorPersonId,
            reviewerPersonNodeId: persistence.projectDetails.reviewerPersonId,
            sourceTemplateId: persistence.projectDetails.sourceTemplateId,
            templateParamValues: readParamValues(
              persistence.projectDetails.templateParamValues
            ),
            templateSyncEnabled: persistence.projectDetails.templateSyncEnabled,
            templateSpawnedAt: persistence.projectDetails.templateSpawnedAt,
            templateSyncedAt: persistence.projectDetails.templateSyncedAt,
            createdAt: persistence.projectDetails.createdAt,
            updatedAt: persistence.projectDetails.updatedAt,
          })
        : null,
    });
  }

  toPersistence(domain: ProjectNode): Prisma.SpydrNodeUncheckedCreateInput {
    return toSpydrNodePersistence(domain, "project");
  }

  toProjectDetailsPersistence(
    nodeId: string,
    details: IProjectDetailsProps
  ): Prisma.SpydrProjectDetailsUncheckedCreateInput {
    return {
      nodeId,
      emoji: details.emoji,
      outcome: details.outcome,
      startDate: details.startDate,
      targetDate: details.targetDate,
      riskLevel: details.riskLevel,
      lastActivityAt: details.lastActivityAt,
      requesterPersonId: details.requesterPersonNodeId,
      assigneePersonId: details.assigneePersonNodeId,
      sponsorPersonId: details.sponsorPersonNodeId,
      reviewerPersonId: details.reviewerPersonNodeId,
      sourceTemplateId: details.sourceTemplateId,
      templateParamValues: details.templateParamValues,
      templateSyncEnabled: details.templateSyncEnabled,
      templateSpawnedAt: details.templateSpawnedAt,
      templateSyncedAt: details.templateSyncedAt,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };
  }
}

function readParamValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  );
  return Object.fromEntries(entries);
}
