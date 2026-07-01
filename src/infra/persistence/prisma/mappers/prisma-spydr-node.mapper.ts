import type { Prisma, SpydrNode as PrismaSpydrNode } from "@prisma/client";
import {
  DomainNode,
  type SpydrNodeStatus,
  type SpydrNodeType,
} from "../../../../domain/models/index.js";
import type { IDomainMapper } from "../../../../domain/mappers/index.js";
import { readNodeLifecycle, writeNodeLifecycle } from "./node-lifecycle.js";

export class PrismaSpydrNodeMapper
  implements
    IDomainMapper<
      PrismaSpydrNode,
      DomainNode,
      Prisma.SpydrNodeUncheckedCreateInput
    >
{
  toDomain(persistence: PrismaSpydrNode): DomainNode {
    return new DomainNode({
      id: persistence.id,
      userId: persistence.userId,
      nodeType: persistence.nodeType as SpydrNodeType,
      title: persistence.title,
      body: persistence.body,
      status: persistence.status as SpydrNodeStatus,
      priority: persistence.priority,
      area: persistence.area,
      tags: persistence.tags,
      sortOrder: persistence.sortOrder,
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt,
      archivedAt: persistence.archivedAt,
      ...readNodeLifecycle(persistence),
    });
  }

  toPersistence(domain: DomainNode): Prisma.SpydrNodeUncheckedCreateInput {
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
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      archivedAt: domain.archivedAt,
      ...writeNodeLifecycle(domain),
    };
  }
}
