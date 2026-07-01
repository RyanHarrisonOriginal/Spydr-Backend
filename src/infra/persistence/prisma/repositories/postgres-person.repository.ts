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

  async findByIdForUser(id: string, userId: string): Promise<PersonNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, userId, nodeType: "person", isDeleted: false },
      include: personInclude,
    });
    return row ? this.mapper.toDomain(row) : null;
  }

  async listByUser(userId: string): Promise<PersonNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { userId, nodeType: "person", isDeleted: false },
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

    const saved = await this.findByIdForUser(entity.id, entity.userId);
    if (!saved) {
      throw new Error("Failed to load saved person");
    }
    return saved;
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
