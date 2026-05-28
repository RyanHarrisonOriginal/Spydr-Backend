import type { PrismaClient } from "@prisma/client";
import type { IDecisionRepository } from "../../../../domain/interfaces/index.js";
import type { DecisionNode } from "../../../../domain/models/decisions/index.js";
import { PrismaDecisionMapper } from "../mappers/prisma-decision.mapper.js";

export class PostgresDecisionRepository implements IDecisionRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaDecisionMapper()
  ) {}

  async findById(id: string): Promise<DecisionNode | null> {
    const row = await this.db.spydrNode.findUnique({
      where: { id },
      include: { decisionDetails: true },
    });

    return row && row.nodeType === "decision" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<DecisionNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, userId, nodeType: "decision" },
      include: { decisionDetails: true },
    });

    return row ? this.mapper.toDomain(row) : null;
  }

  async listByUser(userId: string): Promise<DecisionNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { userId, nodeType: "decision" },
      include: { decisionDetails: true },
      orderBy: { updatedAt: "desc" },
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async save(entity: DecisionNode): Promise<DecisionNode> {
    const nodeData = this.mapper.toPersistence(entity);
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
    await this.db.spydrNode.delete({ where: { id } });
  }
}
