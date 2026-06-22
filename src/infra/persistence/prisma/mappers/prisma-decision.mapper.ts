import type { Prisma } from "@prisma/client";
import { DecisionDetails, DecisionNode } from "../../../../domain/models/decisions/index.js";
import type { IDecisionDetailsProps } from "../../../../domain/models/decisions/index.js";
import type { IDomainMapper } from "../../../../domain/mappers/index.js";
import { readNodeLifecycle, writeNodeLifecycle } from "./node-lifecycle.js";

export type PrismaDecisionWithDetails = Prisma.SpydrNodeGetPayload<{
  include: { decisionDetails: true };
}>;

export class PrismaDecisionMapper
  implements
    IDomainMapper<
      PrismaDecisionWithDetails,
      DecisionNode,
      Prisma.SpydrNodeUncheckedCreateInput
    >
{
  toDomain(persistence: PrismaDecisionWithDetails): DecisionNode {
    return new DecisionNode({
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
      details: persistence.decisionDetails
        ? new DecisionDetails({
            rationale: persistence.decisionDetails.rationale,
            impact: persistence.decisionDetails.impact,
            decidedAt: persistence.decisionDetails.decidedAt,
            supersedesDecisionNodeId:
              persistence.decisionDetails.supersedesDecisionNodeId,
            createdAt: persistence.decisionDetails.createdAt,
            updatedAt: persistence.decisionDetails.updatedAt,
          })
        : null,
    });
  }

  toPersistence(domain: DecisionNode): Prisma.SpydrNodeUncheckedCreateInput {
    return {
      id: domain.id,
      userId: domain.userId,
      nodeType: "decision",
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

  toDecisionDetailsPersistence(
    nodeId: string,
    details: IDecisionDetailsProps
  ): Prisma.SpydrDecisionDetailsUncheckedCreateInput {
    return {
      nodeId,
      rationale: details.rationale,
      impact: details.impact,
      decidedAt: details.decidedAt,
      supersedesDecisionNodeId: details.supersedesDecisionNodeId,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };
  }
}
