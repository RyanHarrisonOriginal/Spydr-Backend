import type { Prisma } from "@prisma/client";
import { IdeaDetails, IdeaNode } from "../../../../domain/models/ideas/index.js";
import type { IIdeaDetailsProps } from "../../../../domain/models/ideas/index.js";
import type { IDomainMapper } from "../../../../domain/mappers/index.js";
import { readNodeLifecycle, writeNodeLifecycle } from "./node-lifecycle.js";

export type PrismaIdeaWithDetails = Prisma.SpydrNodeGetPayload<{
  include: { ideaDetails: true };
}>;

export class PrismaIdeaMapper
  implements
    IDomainMapper<
      PrismaIdeaWithDetails,
      IdeaNode,
      Prisma.SpydrNodeUncheckedCreateInput
    >
{
  toDomain(persistence: PrismaIdeaWithDetails): IdeaNode {
    return new IdeaNode({
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
      details: persistence.ideaDetails
        ? new IdeaDetails({
            confidence: persistence.ideaDetails.confidence
              ? Number(persistence.ideaDetails.confidence)
              : null,
            potentialValue: persistence.ideaDetails.potentialValue,
            promotedToProjectNodeId:
              persistence.ideaDetails.promotedToProjectNodeId,
            createdAt: persistence.ideaDetails.createdAt,
            updatedAt: persistence.ideaDetails.updatedAt,
          })
        : null,
    });
  }

  toPersistence(domain: IdeaNode): Prisma.SpydrNodeUncheckedCreateInput {
    return {
      id: domain.id,
      userId: domain.userId,
      nodeType: "idea",
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

  toIdeaDetailsPersistence(
    nodeId: string,
    details: IIdeaDetailsProps
  ): Prisma.SpydrIdeaDetailsUncheckedCreateInput {
    return {
      nodeId,
      confidence: details.confidence,
      potentialValue: details.potentialValue,
      promotedToProjectNodeId: details.promotedToProjectNodeId,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };
  }
}
