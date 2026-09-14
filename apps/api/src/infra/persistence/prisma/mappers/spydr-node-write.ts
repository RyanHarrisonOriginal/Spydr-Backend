import type { Prisma, PrismaClient, SpydrNodeType } from "@prisma/client";
import type { DomainNode } from "../../../../domains/shared/models/shared.js";
import { writeNodeLifecycle } from "./node-lifecycle.js";

type Db = PrismaClient | Prisma.TransactionClient;

export function toSpydrNodePersistence(
  domain: DomainNode,
  nodeType: SpydrNodeType
): Prisma.SpydrNodeUncheckedCreateInput {
  return {
    id: domain.id,
    orgId: domain.orgId,
    userId: domain.userId,
    personId: domain.personId,
    nodeType,
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

export async function withNodePersonId(
  db: Db,
  data: Prisma.SpydrNodeUncheckedCreateInput
): Promise<Prisma.SpydrNodeUncheckedCreateInput> {
  if (data.personId) return data;

  const person = await db.spydrPersonDetails.findFirst({
    where: { clerkUserId: data.userId, isDeleted: false },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  if (!person) {
    throw new Error("Person not found for current user");
  }

  return { ...data, personId: person.id };
}
