import type { Prisma, SpydrNode as PrismaSpydrNode, SpydrNodeType as PrismaSpydrNodeType } from "@prisma/client";
import {
  DomainNode,
  type SpydrNodeStatus,
  type SpydrNodeType,
} from "../../../../domains/shared/models/shared.js";
import type { IDomainMapper } from "../../../../domains/shared/mappers/mapper.js";
import { readNodeLifecycle } from "./node-lifecycle.js";
import { toSpydrNodePersistence } from "./spydr-node-write.js";

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
      orgId: persistence.orgId,
      userId: persistence.userId,
      personId: persistence.personId,
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
    if (domain.nodeType === "person") {
      throw new Error("People are not persisted as spydr nodes");
    }
    return toSpydrNodePersistence(domain, domain.nodeType as PrismaSpydrNodeType);
  }
}
