import type { NoteNode } from "../../../domain/models/notes/index.js";
import type { IRepresentationMapper } from "../../../domain/mappers/index.js";
import { nodeLifecycleResponse } from "./node-lifecycle-response.js";

export interface INoteResponse {
  id: string;
  userId: string;
  nodeType: "note";
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
  details: null;
}

export class NoteResponseMapper
  implements IRepresentationMapper<NoteNode, INoteResponse>
{
  toRepresentation(domain: NoteNode): INoteResponse {
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
      details: null,
    };
  }
}
