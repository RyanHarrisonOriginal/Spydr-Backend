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

  async findByIdForOrg(id: string, orgId: string): Promise<DomainNode | null> {
    const row = await this.db.spydrNode.findFirst({ where: { id, orgId } });
    return row ? this.mapper.toDomain(row) : null;
  }

  async list(criteria: ISpydrNodeListCriteria): Promise<DomainNode[]> {
    const where: Prisma.SpydrNodeWhereInput = {
      orgId: criteria.orgId,
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

  async reorderForOrg(
    orgId: string,
    nodeType: SpydrNodeType,
    orderedIds: readonly string[]
  ): Promise<void> {
    if (orderedIds.length === 0) return;

    const rows = await this.db.spydrNode.findMany({
      where: {
        orgId,
        nodeType,
        isDeleted: false,
      },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
      select: { id: true },
    });

    if (rows.length === 0) return;

    const allIds = rows.map((row) => row.id);
    const allowedIds = new Set(allIds);
    const normalizedOrderedIds = orderedIds.filter((id) => allowedIds.has(id));
    const orderedSet = new Set(normalizedOrderedIds);
    const trailingIds = allIds.filter((id) => !orderedSet.has(id));
    const finalOrder = [...normalizedOrderedIds, ...trailingIds];

    if (finalOrder.length === 0) return;

    await this.db.$transaction(
      finalOrder.map((id, index) =>
        this.db.spydrNode.update({
          where: { id },
          data: { sortOrder: index * 1000 },
        })
      )
    );
  }

  async nextSortOrderForOrg(orgId: string, nodeType: SpydrNodeType): Promise<number> {
    const result = await this.db.spydrNode.aggregate({
      where: { orgId, nodeType, isDeleted: false },
      _max: { sortOrder: true },
    });

    const currentMax = result._max.sortOrder;
    return (currentMax ?? -1000) + 1000;
  }
}
