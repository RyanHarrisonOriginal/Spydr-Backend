import type { PrismaClient } from "@prisma/client";
import type { IPersonRepository } from "../../../../domain/interfaces/person-repository.js";
import type { PersonNode } from "../../../../domain/models/people/index.js";
import { PrismaPersonMapper } from "../mappers/prisma-person.mapper.js";

const personInclude = { personDetails: true } as const;

export class PostgresPersonRepository implements IPersonRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaPersonMapper()
  ) {}

  async findById(id: string): Promise<PersonNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: personInclude,
    });
    return row && row.nodeType === "person" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForOrg(id: string, orgId: string): Promise<PersonNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, orgId, nodeType: "person", isDeleted: false },
      include: personInclude,
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async listByOrg(orgId: string): Promise<PersonNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "person", isDeleted: false },
      include: personInclude,
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    return rows.map((row) => this.mapper.toDomain(row));
  }

  async save(entity: PersonNode): Promise<PersonNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (entity.details) {
        const detailsData = this.mapper.toPersonDetailsPersistence(
          entity.id,
          entity.details
        );
        const { nodeId, ...detailsUpdateData } = detailsData;

        await tx.spydrPersonDetails.upsert({
          where: { nodeId },
          create: detailsData,
          update: detailsUpdateData,
        });
      }
    });

    const saved = await this.findByIdForOrg(entity.id, entity.orgId);
    if (!saved) {
      throw new Error("Failed to load saved person");
    }
    return saved;
  }

  async clearPersonReferences(orgId: string, personId: string): Promise<void> {
    const now = new Date();
    const projectNodeScope = { orgId, nodeType: "project" as const };

    await this.db.$transaction([
      this.db.spydrProjectDetails.updateMany({
        where: {
          requesterPersonNodeId: personId,
          node: projectNodeScope,
        },
        data: { requesterPersonNodeId: null, updatedAt: now },
      }),
      this.db.spydrProjectDetails.updateMany({
        where: {
          assigneePersonNodeId: personId,
          node: projectNodeScope,
        },
        data: { assigneePersonNodeId: null, updatedAt: now },
      }),
      this.db.spydrProjectDetails.updateMany({
        where: {
          sponsorPersonNodeId: personId,
          node: projectNodeScope,
        },
        data: { sponsorPersonNodeId: null, updatedAt: now },
      }),
      this.db.spydrProjectDetails.updateMany({
        where: {
          reviewerPersonNodeId: personId,
          node: projectNodeScope,
        },
        data: { reviewerPersonNodeId: null, updatedAt: now },
      }),
      this.db.spydrTaskDetails.updateMany({
        where: {
          assigneePersonNodeId: personId,
          node: { orgId, nodeType: "task" },
        },
        data: { assigneePersonNodeId: null, updatedAt: now },
      }),
    ]);
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
