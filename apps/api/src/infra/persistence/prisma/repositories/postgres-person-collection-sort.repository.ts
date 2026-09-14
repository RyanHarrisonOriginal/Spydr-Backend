import type { PrismaClient } from "@prisma/client";
import type {
  IPersonCollectionSortRepository,
  PersonCollectionNodeType,
} from "../../../../domains/people/collection-sort-repository.js";

export class PostgresPersonCollectionSortRepository
  implements IPersonCollectionSortRepository
{
  constructor(private readonly db: PrismaClient) {}

  async getSortOrderMap(
    orgId: string,
    personId: string,
    nodeIds: readonly string[]
  ): Promise<Map<string, number>> {
    if (nodeIds.length === 0) return new Map();

    const rows = await this.db.spydrPersonCollectionSort.findMany({
      where: {
        orgId,
        personId,
        nodeId: { in: [...nodeIds] },
      },
      select: { nodeId: true, sortOrder: true },
    });

    return new Map(rows.map((row) => [row.nodeId, row.sortOrder]));
  }

  async reorderForPerson(
    orgId: string,
    personId: string,
    nodeType: PersonCollectionNodeType,
    orderedIds: readonly string[],
    eligibleIds: readonly string[]
  ): Promise<void> {
    if (eligibleIds.length === 0) return;

    const eligibleSet = new Set(eligibleIds);
    const normalizedOrderedIds = orderedIds.filter((id) => eligibleSet.has(id));
    const orderedSet = new Set(normalizedOrderedIds);
    const trailingIds = eligibleIds.filter((id) => !orderedSet.has(id));
    const finalOrder = [...normalizedOrderedIds, ...trailingIds];

    await this.db.spydrPersonCollectionSort.deleteMany({
      where: {
        orgId,
        personId,
        nodeType,
        nodeId: { notIn: [...eligibleIds] },
      },
    });

    await this.db.$transaction(
      finalOrder.map((nodeId, index) =>
        this.db.spydrPersonCollectionSort.upsert({
          where: {
            orgId_personId_nodeId: {
              orgId,
              personId,
              nodeId,
            },
          },
          create: {
            orgId,
            personId,
            nodeId,
            nodeType,
            sortOrder: index * 1000,
          },
          update: {
            nodeType,
            sortOrder: index * 1000,
          },
        })
      )
    );
  }

  async deleteForPerson(orgId: string, personId: string): Promise<void> {
    await this.db.spydrPersonCollectionSort.deleteMany({
      where: { orgId, personId },
    });
  }
}
