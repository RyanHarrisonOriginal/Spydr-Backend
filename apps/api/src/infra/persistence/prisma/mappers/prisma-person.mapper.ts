import type { Prisma, SpydrPersonDetails } from "@prisma/client";
import { PersonDetails, PersonNode } from "../../../../domains/people/models/index.js";
import type { IDomainMapper } from "../../../../domains/shared/mappers/mapper.js";
import { readNodeLifecycle, writeNodeLifecycle } from "./node-lifecycle.js";

export type PrismaPersonRow = SpydrPersonDetails;

export function personVisibleInOrgWhere(
  orgId: string
): Prisma.SpydrPersonDetailsWhereInput {
  return {
    isDeleted: false,
    OR: [{ orgId }, { memberships: { some: { organizationId: orgId } } }],
  };
}

export class PrismaPersonMapper
  implements
    IDomainMapper<
      PrismaPersonRow,
      PersonNode,
      Prisma.SpydrPersonDetailsUncheckedCreateInput
    >
{
  toDomain(persistence: PrismaPersonRow): PersonNode {
    return new PersonNode({
      id: persistence.id,
      orgId: persistence.orgId,
      userId: persistence.createdByUserId,
      personId: persistence.id,
      title: persistence.fullName,
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
      details: new PersonDetails({
        fullName: persistence.fullName,
        email: persistence.email,
        title: persistence.title,
        organization: persistence.organization,
        relationshipContext: persistence.relationshipContext,
        clerkUserId: persistence.clerkUserId ?? null,
        createdAt: persistence.createdAt,
        updatedAt: persistence.updatedAt,
      }),
    });
  }

  toPersistence(
    domain: PersonNode
  ): Prisma.SpydrPersonDetailsUncheckedCreateInput {
    return {
      id: domain.id,
      orgId: domain.orgId,
      createdByUserId: domain.userId,
      fullName: domain.details?.fullName ?? domain.title,
      email: domain.details?.email ?? null,
      title: domain.details?.title ?? null,
      organization: domain.details?.organization ?? null,
      relationshipContext: domain.details?.relationshipContext ?? null,
      clerkUserId: domain.details?.clerkUserId ?? null,
      body: domain.body,
      status: domain.status,
      priority: domain.priority,
      area: domain.area,
      tags: domain.tags,
      sortOrder: domain.sortOrder,
      archivedAt: domain.archivedAt,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      ...writeNodeLifecycle(domain),
    };
  }
}
