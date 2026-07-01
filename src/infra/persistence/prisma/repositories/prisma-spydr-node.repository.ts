import type { Prisma, PrismaClient, SpydrNodeType } from "@prisma/client";
import type { DomainNode } from "../../../../domain/models/index.js";
import type {
  ISpydrNodeListCriteria,
  ISpydrNodeRepository,
} from "../../../../domain/interfaces/index.js";
import { PrismaSpydrNodeMapper } from "../mappers/prisma-spydr-node.mapper.js";

export class PrismaSpydrNodeRepository implements ISpydrNodeRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaSpydrNodeMapper()
  ) {}

  async findById(id: string): Promise<DomainNode | null> {
    const row = await this.db.spydrNode.findUnique({ where: { id } });
    return row ? this.mapper.toDomain(row) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<DomainNode | null> {
    const row = await this.db.spydrNode.findFirst({ where: { id, userId } });
    return row ? this.mapper.toDomain(row) : null;
  }

  async list(criteria: ISpydrNodeListCriteria): Promise<DomainNode[]> {
    const where: Prisma.SpydrNodeWhereInput = {
      userId: criteria.userId,
      ...(criteria.nodeType ? { nodeType: criteria.nodeType } : {}),
      ...(criteria.status ? { status: criteria.status } : {}),
      ...(criteria.tag ? { tags: { has: criteria.tag } } : {}),
    };

    const rows = await this.db.spydrNode.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async save(entity: DomainNode): Promise<DomainNode> {
    const data = this.mapper.toPersistence(entity);
    const { id, ...updateData } = data;
    const saved = await this.db.spydrNode.upsert({
      where: { id },
      create: data,
      update: updateData,
    });

    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.delete({ where: { id } });
  }

  async reorderForUser(
    userId: string,
    nodeType: SpydrNodeType,
    orderedIds: readonly string[]
  ): Promise<void> {
    if (orderedIds.length === 0) return;

    const rows = await this.db.spydrNode.findMany({
      where: {
        userId,
        nodeType,
        isDeleted: false,
        id: { in: [...orderedIds] },
      },
      select: { id: true },
    });

    const allowedIds = new Set(rows.map((row) => row.id));
    const normalizedIds = orderedIds.filter((id) => allowedIds.has(id));
    if (normalizedIds.length === 0) return;

    await this.db.$transaction(
      normalizedIds.map((id, index) =>
        this.db.spydrNode.update({
          where: { id },
          data: { sortOrder: index * 1000 },
        })
      )
    );
  }
}
