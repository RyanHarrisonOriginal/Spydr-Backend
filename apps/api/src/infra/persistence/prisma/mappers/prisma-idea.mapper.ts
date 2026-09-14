import type { Prisma } from "@prisma/client";
import { IdeaDetails, IdeaNode } from "../../../../domains/ideas/models/index.js";
import type { IIdeaDetailsProps } from "../../../../domains/ideas/models/index.js";
import type { IDomainMapper } from "../../../../domains/shared/mappers/mapper.js";
import { readNodeLifecycle } from "./node-lifecycle.js";
import { toSpydrNodePersistence } from "./spydr-node-write.js";

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
    return toSpydrNodePersistence(domain, "idea");
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
