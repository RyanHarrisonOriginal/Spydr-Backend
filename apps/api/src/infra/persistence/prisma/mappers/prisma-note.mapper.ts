import type { Prisma } from "@prisma/client";
import { NoteNode } from "../../../../domains/notes/models/index.js";
import type { IDomainMapper } from "../../../../domains/shared/mappers/mapper.js";
import { readNodeLifecycle, writeNodeLifecycle } from "./node-lifecycle.js";

export type PrismaNote = Prisma.SpydrNodeGetPayload<Record<string, never>>;

export class PrismaNoteMapper
  implements
    IDomainMapper<
      PrismaNote,
      NoteNode,
      Prisma.SpydrNodeUncheckedCreateInput
    >
{
  toDomain(persistence: PrismaNote): NoteNode {
    return new NoteNode({
      id: persistence.id,
      orgId: persistence.orgId,
      userId: persistence.userId,
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
      details: null,
    });
  }

  toPersistence(domain: NoteNode): Prisma.SpydrNodeUncheckedCreateInput {
    return {
      id: domain.id,
      orgId: domain.orgId,
      userId: domain.userId,
      nodeType: "note",
      title: domain.title,
      body: domain.body,
      status: domain.status,
      priority: domain.priority,
      area: domain.area,
      tags: domain.tags,
      sortOrder: domain.sortOrder,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      archivedAt: domain.archivedAt,
      ...writeNodeLifecycle(domain),
    };
  }
}
