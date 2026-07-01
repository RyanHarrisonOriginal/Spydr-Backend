import type { IdeaNode } from "../../../domain/models/ideas/index.js";
import type { IRepresentationMapper } from "../../../domain/mappers/index.js";
import type { IIdeaResponse } from "./project-response.mapper.js";
import { nodeLifecycleResponse } from "./node-lifecycle-response.js";

export class IdeaResponseMapper
  implements IRepresentationMapper<IdeaNode, IIdeaResponse>
{
  toRepresentation(domain: IdeaNode): IIdeaResponse {
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
      sortOrder: domain.sortOrder,
      createdAt: domain.createdAt.toISOString(),
      updatedAt: domain.updatedAt.toISOString(),
      archivedAt: domain.archivedAt?.toISOString() ?? null,
      ...nodeLifecycleResponse(domain),
      details: domain.details
        ? {
            confidence: domain.details.confidence,
            potentialValue: domain.details.potentialValue,
            promotedToProjectNodeId: domain.details.promotedToProjectNodeId,
            createdAt: domain.details.createdAt.toISOString(),
            updatedAt: domain.details.updatedAt.toISOString(),
          }
        : null,
    };
  }
}
