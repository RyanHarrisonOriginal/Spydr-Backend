import type { PrismaClient, SpydrNodeType as PrismaSpydrNodeType } from "@prisma/client";
import type { DomainNode, SpydrNodeType } from "../../../../domains/shared/models/shared.js";
import type { ISpydrNodeRepository } from "../../../../domains/index.js";
import { PrismaSpydrNodeMapper } from "../mappers/prisma-spydr-node.mapper.js";
import { withNodePersonId } from "../mappers/spydr-node-write.js";

function asPrismaNodeType(nodeType: SpydrNodeType): PrismaSpydrNodeType | null {
  if (nodeType === "person") return null;
  return nodeType;
}

export class PrismaSpydrNodeRepository implements ISpydrNodeRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaSpydrNodeMapper()
  ) {}

  async get(criteria: { id: string; orgId?: string; includeDeleted?: boolean }) {
    if (criteria.orgId) {
      return this.findByIdForOrg(criteria.id, criteria.orgId);
    }
    return this.findById(criteria.id);
  }

  async save(
    entity: DomainNode,
    options?: {
      strategy?: string;
      context?: {
        orgId?: string;
        nodeType?: SpydrNodeType;
        orderedIds?: readonly string[];
      };
    }
  ): Promise<DomainNode> {
    const strategy = options?.strategy ?? "standard";
    if (strategy === "reorder") {
      const ctx = options?.context;
      if (!ctx?.orgId || !ctx.nodeType || !ctx.orderedIds) {
        throw new Error("reorder strategy requires orgId, nodeType, orderedIds");
      }
      await this.reorderForOrg(ctx.orgId, ctx.nodeType, ctx.orderedIds);
      return entity;
    }

    const data = await withNodePersonId(this.db, this.mapper.toPersistence(entity));
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

  private async findById(id: string): Promise<DomainNode | null> {
    const row = await this.db.spydrNode.findUnique({ where: { id } });
    return row ? this.mapper.toDomain(row) : null;
  }

  private async findByIdForOrg(id: string, orgId: string): Promise<DomainNode | null> {
    const row = await this.db.spydrNode.findFirst({ where: { id, orgId } });
    return row ? this.mapper.toDomain(row) : null;
  }

  private async reorderForOrg(
    orgId: string,
    nodeType: SpydrNodeType,
    orderedIds: readonly string[]
  ): Promise<void> {
    if (orderedIds.length === 0) return;

    const prismaNodeType = asPrismaNodeType(nodeType);
    if (!prismaNodeType) return;

    const rows = await this.db.spydrNode.findMany({
      where: {
        orgId,
        nodeType: prismaNodeType,
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
}
