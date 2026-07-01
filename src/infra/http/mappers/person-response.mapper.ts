import type { PersonNode } from "../../../domain/models/people/index.js";
import type { IRepresentationMapper } from "../../../domain/mappers/index.js";

export interface IPersonDetailsResponse {
  fullName: string;
  email: string | null;
  title: string | null;
  organization: string | null;
  relationshipContext: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPersonResponse {
  id: string;
  userId: string;
  nodeType: "person";
  title: string;
  body: string;
  status: string;
  priority: string;
  tags: string[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  details: IPersonDetailsResponse | null;
}

export class PersonResponseMapper
  implements IRepresentationMapper<PersonNode, IPersonResponse>
{
  toRepresentation(domain: PersonNode): IPersonResponse {
    return {
      id: domain.id,
      userId: domain.userId,
      nodeType: domain.nodeType,
      title: domain.details?.fullName ?? domain.title,
      body: domain.body,
      status: domain.status,
      priority: domain.priority,
      tags: domain.tags,
      sortOrder: domain.sortOrder,
      createdAt: domain.createdAt.toISOString(),
      updatedAt: domain.updatedAt.toISOString(),
      archivedAt: domain.archivedAt?.toISOString() ?? null,
      details: domain.details
        ? {
            fullName: domain.details.fullName,
            email: domain.details.email,
            title: domain.details.title,
            organization: domain.details.organization,
            relationshipContext: domain.details.relationshipContext,
            createdAt: domain.details.createdAt.toISOString(),
            updatedAt: domain.details.updatedAt.toISOString(),
          }
        : null,
    };
  }
}
