import type { Prisma } from "@prisma/client";
import { ResourceDetails, ResourceNode } from "../../../../domains/resources/models/index.js";
import type { IResourceDetailsProps } from "../../../../domains/resources/models/index.js";
import type { IDomainMapper } from "../../../../domains/shared/mappers/mapper.js";
import { readNodeLifecycle } from "./node-lifecycle.js";
import { toSpydrNodePersistence } from "./spydr-node-write.js";

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
      orgId: persistence.orgId,
      userId: persistence.userId,
      personId: persistence.personId,
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
    return toSpydrNodePersistence(domain, "resource");
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
