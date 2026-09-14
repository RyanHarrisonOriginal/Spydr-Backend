import type { PrismaClient } from "@prisma/client";
import type { IDecisionRepository } from "../../../../domains/index.js";
import type { DecisionNode } from "../../../../domains/decisions/models/index.js";
import { PrismaDecisionMapper } from "../mappers/prisma-decision.mapper.js";
import { withNodePersonId } from "../mappers/spydr-node-write.js";

export class PostgresDecisionRepository implements IDecisionRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaDecisionMapper()
  ) {}

  async get(criteria: { id: string; orgId?: string; includeDeleted?: boolean }) {
    if (criteria.orgId) {
      return this.findByIdForOrg(criteria.id, criteria.orgId);
    }
    return this.findById(criteria.id);
  }

  async save(entity: DecisionNode): Promise<DecisionNode> {
    const nodeData = await withNodePersonId(this.db, this.mapper.toPersistence(entity));
    const { id, ...nodeUpdateData } = nodeData;

    await this.db.$transaction(async (tx) => {
      await tx.spydrNode.upsert({
        where: { id },
        create: nodeData,
        update: nodeUpdateData,
      });

      if (!entity.details) return;

      const detailsData = this.mapper.toDecisionDetailsPersistence(
        entity.id,
        entity.details
      );
      const { nodeId, ...detailsUpdateData } = detailsData;

      await tx.spydrDecisionDetails.upsert({
        where: { nodeId },
        create: detailsData,
        update: detailsUpdateData,
      });
    });

    const saved = await this.findById(entity.id);
    if (!saved) throw new Error("Failed to save decision");
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

  private async findById(id: string): Promise<DecisionNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { decisionDetails: true },
    });

    return row && row.nodeType === "decision" ? this.mapper.toDomain(row) : null;
  }

  private async findByIdForOrg(
    id: string,
    orgId: string
  ): Promise<DecisionNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, orgId, nodeType: "decision" },
      include: { decisionDetails: true },
    });

    return row ? this.mapper.toDomain(row) : null;
  }
}
