import type { Prisma } from "@prisma/client";
import {
  ProjectAreaDetails,
  ProjectAreaNode,
} from "../../../../domain/models/project-areas/index.js";
import type { IProjectAreaDetailsProps } from "../../../../domain/models/project-areas/index.js";
import type { IDomainMapper } from "../../../../domain/mappers/index.js";
import { readNodeLifecycle, writeNodeLifecycle } from "./node-lifecycle.js";

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
    return {
      id: domain.id,
      orgId: domain.orgId,
      userId: domain.userId,
      nodeType: "project_area",
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
