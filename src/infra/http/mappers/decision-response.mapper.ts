import type { DecisionNode } from "../../../domain/models/decisions/index.js";
import type { IRepresentationMapper } from "../../../domain/mappers/index.js";

export interface IDecisionResponse {
  id: string;
  userId: string;
  nodeType: "decision";
  title: string;
  body: string;
  status: string;
  priority: string;
  area: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  details: {
    rationale: string;
    impact: string;
    decidedAt: string;
    supersedesDecisionNodeId: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export class DecisionResponseMapper
  implements IRepresentationMapper<DecisionNode, IDecisionResponse>
{
  toRepresentation(domain: DecisionNode): IDecisionResponse {
    return {
      id: domain.id,
      userId: domain.userId,
      nodeType: domain.nodeType,
      title: domain.title,
      body: domain.body,
      status: domain.status,
      priority: domain.priority,
      area: domain.area,
      tags: domain.tags,
      createdAt: domain.createdAt.toISOString(),
      updatedAt: domain.updatedAt.toISOString(),
      archivedAt: domain.archivedAt?.toISOString() ?? null,
      details: domain.details
        ? {
            rationale: domain.details.rationale,
            impact: domain.details.impact,
            decidedAt: domain.details.decidedAt.toISOString(),
            supersedesDecisionNodeId: domain.details.supersedesDecisionNodeId,
            createdAt: domain.details.createdAt.toISOString(),
            updatedAt: domain.details.updatedAt.toISOString(),
          }
        : null,
    };
  }
}
