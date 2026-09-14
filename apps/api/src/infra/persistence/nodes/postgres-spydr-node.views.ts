import type { Prisma, PrismaClient, SpydrNodeType as PrismaSpydrNodeType } from "@prisma/client";
import type {
  DomainNode,
  SpydrNodeType,
} from "../../../domains/shared/models/shared.js";
import type {
  ISpydrNodeListCriteria,
  ISpydrNodeViews,
} from "../../../domains/nodes/views.js";
import { PrismaSpydrNodeMapper } from "../prisma/mappers/prisma-spydr-node.mapper.js";

function asPrismaNodeType(nodeType: SpydrNodeType): PrismaSpydrNodeType | null {
  if (nodeType === "person") return null;
  return nodeType;
}

export class PostgresSpydrNodeViews implements ISpydrNodeViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaSpydrNodeMapper()
  ) {}

  async list(criteria: ISpydrNodeListCriteria): Promise<DomainNode[]> {
    const nodeType = criteria.nodeType
      ? asPrismaNodeType(criteria.nodeType)
      : undefined;
    if (criteria.nodeType && !nodeType) return [];

    const where: Prisma.SpydrNodeWhereInput = {
      orgId: criteria.orgId,
      ...(nodeType ? { nodeType } : {}),
      ...(criteria.status ? { status: criteria.status } : {}),
      ...(criteria.tag ? { tags: { has: criteria.tag } } : {}),
    };

    const rows = await this.db.spydrNode.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async nextSortOrderForOrg(
    orgId: string,
    nodeType: SpydrNodeType
  ): Promise<number> {
    const prismaNodeType = asPrismaNodeType(nodeType);
    if (!prismaNodeType) return 0;

    const result = await this.db.spydrNode.aggregate({
      where: { orgId, nodeType: prismaNodeType, isDeleted: false },
      _max: { sortOrder: true },
    });

    const currentMax = result._max.sortOrder;
    return (currentMax ?? -1000) + 1000;
  }
}
