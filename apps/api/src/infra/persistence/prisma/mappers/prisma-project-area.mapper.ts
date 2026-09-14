import type { Prisma } from "@prisma/client";
import {
  ProjectAreaDetails,
  ProjectAreaNode,
} from "../../../../domains/project-areas/models/index.js";
import type { IProjectAreaDetailsProps } from "../../../../domains/project-areas/models/index.js";
import type { IDomainMapper } from "../../../../domains/shared/mappers/mapper.js";
import { readNodeLifecycle } from "./node-lifecycle.js";
import { toSpydrNodePersistence } from "./spydr-node-write.js";

export type PrismaProjectAreaWithDetails = Prisma.SpydrNodeGetPayload<{
  include: { projectAreaDetails: true };
}>;

export class PrismaProjectAreaMapper
  implements
    IDomainMapper<
      PrismaProjectAreaWithDetails,
      ProjectAreaNode,
      Prisma.SpydrNodeUncheckedCreateInput
    >
{
  toDomain(persistence: PrismaProjectAreaWithDetails): ProjectAreaNode {
    return new ProjectAreaNode({
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
      createdAt: persistence.createdAt,
      updatedAt: persistence.updatedAt,
      archivedAt: persistence.archivedAt,
      ...readNodeLifecycle(persistence),
      details: persistence.projectAreaDetails
        ? new ProjectAreaDetails({
            color: persistence.projectAreaDetails.color,
            createdAt: persistence.projectAreaDetails.createdAt,
            updatedAt: persistence.projectAreaDetails.updatedAt,
          })
        : null,
    });
  }

  toPersistence(domain: ProjectAreaNode): Prisma.SpydrNodeUncheckedCreateInput {
    return toSpydrNodePersistence(domain, "project_area");
  }

  toProjectAreaDetailsPersistence(
    nodeId: string,
    details: IProjectAreaDetailsProps
  ): Prisma.SpydrProjectAreaDetailsUncheckedCreateInput {
    return {
      nodeId,
      color: details.color,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
    };
  }
}
