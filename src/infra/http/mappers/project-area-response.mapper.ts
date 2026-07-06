import type { ProjectAreaNode } from "../../../domain/models/project-areas/index.js";
import type { IRepresentationMapper } from "../../../domain/mappers/index.js";

export interface IProjectAreaDetailsResponse {
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface IProjectAreaResponse {
  id: string;
  userId: string;
  organizationId: string;
  nodeType: "project_area";
  title: string;
  body: string;
  status: string;
  priority: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  details: IProjectAreaDetailsResponse | null;
}

export class ProjectAreaResponseMapper
  implements IRepresentationMapper<ProjectAreaNode, IProjectAreaResponse>
{
  toRepresentation(domain: ProjectAreaNode): IProjectAreaResponse {
    return {
      id: domain.id,
      userId: domain.userId,
      organizationId: domain.orgId,
      nodeType: domain.nodeType,
      title: domain.title,
      body: domain.body,
      status: domain.status,
      priority: domain.priority,
      tags: domain.tags,
      createdAt: domain.createdAt.toISOString(),
      updatedAt: domain.updatedAt.toISOString(),
      archivedAt: domain.archivedAt?.toISOString() ?? null,
      details: domain.details
        ? {
            color: domain.details.color,
            createdAt: domain.details.createdAt.toISOString(),
            updatedAt: domain.details.updatedAt.toISOString(),
          }
        : null,
    };
  }
}
