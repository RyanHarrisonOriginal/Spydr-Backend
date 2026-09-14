import type { PrismaClient } from "@prisma/client";
import type { IProjectAreaRepository } from "../../../../domains/project-areas/repository.js";
import type { ProjectAreaNode } from "../../../../domains/project-areas/models/index.js";
import { PrismaProjectAreaMapper } from "../mappers/prisma-project-area.mapper.js";
import { withNodePersonId } from "../mappers/spydr-node-write.js";

const projectAreaInclude = { projectAreaDetails: true } as const;

export class PostgresProjectAreaRepository implements IProjectAreaRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaProjectAreaMapper()
  ) {}

  async get(criteria: { id: string; orgId?: string; includeDeleted?: boolean }) {
    if (criteria.orgId) {
      return this.findByIdForOrg(criteria.id, criteria.orgId);
    }
    return this.findById(criteria.id);
  }

  async save(
    entity: ProjectAreaNode,
    options?: {
      strategy?: string;
      context?: { orgId?: string; title?: string };
    }
  ): Promise<ProjectAreaNode> {
    const strategy = options?.strategy ?? "standard";
    if (strategy === "clearProjectLinks") {
      const orgId = options?.context?.orgId ?? entity.orgId;
      const title = options?.context?.title ?? entity.title;
      await this.clearProjectsUsingArea(orgId, title);
      return entity;
    }

    const nodeData = await withNodePersonId(this.db, this.mapper.toPersistence(entity));
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (entity.details) {
        const detailsData = this.mapper.toProjectAreaDetailsPersistence(
          entity.id,
          entity.details
        );
        const { nodeId, ...detailsUpdateData } = detailsData;

        await tx.spydrProjectAreaDetails.upsert({
          where: { nodeId },
          create: detailsData,
          update: detailsUpdateData,
        });
      }
    });

    const saved = await this.findByIdForOrg(entity.id, entity.orgId);
    if (!saved) {
      throw new Error("Failed to load saved project area");
    }
    return saved;
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.delete({ where: { id } });
  }

  private async findById(id: string): Promise<ProjectAreaNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: projectAreaInclude,
    });
    return row && row.nodeType === "project_area"
      ? this.mapper.toDomain(row)
      : null;
  }

  private async findByIdForOrg(
    id: string,
    orgId: string
  ): Promise<ProjectAreaNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, orgId, nodeType: "project_area", isDeleted: false },
      include: projectAreaInclude,
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  private async clearProjectsUsingArea(
    orgId: string,
    areaTitle: string
  ): Promise<void> {
    await this.db.spydrNode.updateMany({
      where: {
        orgId,
        nodeType: "project",
        area: { equals: areaTitle, mode: "insensitive" },
      },
      data: {
        area: null,
        updatedAt: new Date(),
      },
    });
  }
}
