import type { Prisma } from "@prisma/client";
import { PersonDetails, PersonNode } from "../../../../domain/models/people/index.js";
import type { IPersonDetailsProps } from "../../../../domain/models/people/index.js";
import type { IDomainMapper } from "../../../../domain/mappers/index.js";
import { readNodeLifecycle, writeNodeLifecycle } from "./node-lifecycle.js";

export type PrismaPersonWithDetails = Prisma.SpydrNodeGetPayload<{
  include: { personDetails: true };
}>;

export class PrismaPersonMapper
  implements
    IDomainMapper<
      PrismaPersonWithDetails,
      PersonNode,
      Prisma.SpydrNodeUncheckedCreateInput
    >
{
  toDomain(persistence: PrismaPersonWithDetails): PersonNode {
    const fullName = persistence.personDetails?.fullName ?? persistence.title;

    return new PersonNode({
      id: persistence.id,
      userId: persistence.userId,
      title: fullName,
      body: persistence.body,
      status: persistence.status,
      priority: persistence.priority,
      area: persistence.area,
      tags: persistence.tags,
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt,
      archivedAt: persistence.archivedAt,
      ...readNodeLifecycle(persistence),
      details: persistence.personDetails
        ? new PersonDetails({
            fullName: persistence.personDetails.fullName,
            email: persistence.personDetails.email,
            title: persistence.personDetails.title,
            organization: persistence.personDetails.organization,
            relationshipContext: persistence.personDetails.relationshipContext,
            createdAt: persistence.personDetails.createdAt,
            updatedAt: persistence.personDetails.updatedAt,
          })
        : null,
    });
  }

  toPersistence(domain: PersonNode): Prisma.SpydrNodeUncheckedCreateInput {
    return {
      id: domain.id,
      userId: domain.userId,
      nodeType: "person",
      title: domain.details?.fullName ?? domain.title,
      body: domain.body,
      status: domain.status,
      priority: domain.priority,
      area: domain.area,
      tags: domain.tags,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
      archivedAt: domain.archivedAt,
      ...writeNodeLifecycle(domain),
    };
  }

  toPersonDetailsPersistence(
    nodeId: string,
    details: IPersonDetailsProps
  ): Prisma.SpydrPersonDetailsUncheckedCreateInput {
    return {
      nodeId,
      fullName: details.fullName,
      email: details.email,
      title: details.title,
      organization: details.organization,
      relationshipContext: details.relationshipContext,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };
  }
}
