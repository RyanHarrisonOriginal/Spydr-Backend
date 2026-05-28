import type { Prisma, PrismaClient } from "@prisma/client";
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
      orderBy: { updatedAt: "desc" },
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
}
