import type { ResourceNode } from "../../../domain/models/resources/index.js";
import type { IRepresentationMapper } from "../../../domain/mappers/index.js";
import { nodeLifecycleResponse } from "./node-lifecycle-response.js";

export interface IResourceResponse {
  id: string;
  userId: string;
  nodeType: "resource";
  title: string;
  body: string;
  status: string;
  priority: string;
  area: string | null;
  tags: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  details: {
    resourceType: string | null;
    url: string | null;
    fileRef: string | null;
    externalSource: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export class ResourceResponseMapper
  implements IRepresentationMapper<ResourceNode, IResourceResponse>
{
  toRepresentation(domain: ResourceNode): IResourceResponse {
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
            resourceType: domain.details.resourceType,
            url: domain.details.url,
            fileRef: domain.details.fileRef,
            externalSource: domain.details.externalSource,
            createdAt: domain.details.createdAt.toISOString(),
            updatedAt: domain.details.updatedAt.toISOString(),
          }
        : null,
    };
  }
}
