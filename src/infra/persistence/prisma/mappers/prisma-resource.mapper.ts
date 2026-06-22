import type { Prisma } from "@prisma/client";
import { ResourceDetails, ResourceNode } from "../../../../domain/models/resources/index.js";
import type { IResourceDetailsProps } from "../../../../domain/models/resources/index.js";
import type { IDomainMapper } from "../../../../domain/mappers/index.js";
import { readNodeLifecycle, writeNodeLifecycle } from "./node-lifecycle.js";

export type PrismaResourceWithDetails = Prisma.SpydrNodeGetPayload<{
  include: { resourceDetails: true };
}>;

export class PrismaResourceMapper
  implements
    IDomainMapper<
      PrismaResourceWithDetails,
      ResourceNode,
      Prisma.SpydrNodeUncheckedCreateInput
    >
{
  toDomain(persistence: PrismaResourceWithDetails): ResourceNode {
    return new ResourceNode({
      id: persistence.id,
      userId: persistence.userId,
      title: persistence.title,
      body: persistence.body,
      status: persistence.status,
      priority: persistence.priority,
      area: persistence.area,
      tags: persistence.tags,
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt,
      archivedAt: persistence.archivedAt,
      ...readNodeLifecycle(persistence),
      details: persistence.resourceDetails
        ? new ResourceDetails({
            resourceType: persistence.resourceDetails.resourceType,
            url: persistence.resourceDetails.url,
            fileRef: persistence.resourceDetails.fileRef,
            externalSource: persistence.resourceDetails.externalSource,
            createdAt: persistence.resourceDetails.createdAt,
            updatedAt: persistence.resourceDetails.updatedAt,
          })
        : null,
    });
  }

  toPersistence(domain: ResourceNode): Prisma.SpydrNodeUncheckedCreateInput {
    return {
      id: domain.id,
      userId: domain.userId,
      nodeType: "resource",
      title: domain.title,
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

  toResourceDetailsPersistence(
    nodeId: string,
    details: IResourceDetailsProps
  ): Prisma.SpydrResourceDetailsUncheckedCreateInput {
    return {
      nodeId,
      resourceType: details.resourceType,
      url: details.url,
      fileRef: details.fileRef,
      externalSource: details.externalSource,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };
  }
}
