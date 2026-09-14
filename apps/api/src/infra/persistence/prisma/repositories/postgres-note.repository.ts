import type { PrismaClient } from "@prisma/client";
import type { INoteRepository } from "../../../../domains/index.js";
import type { NoteNode } from "../../../../domains/notes/models/index.js";
import { PrismaNoteMapper } from "../mappers/prisma-note.mapper.js";
import { withNodePersonId } from "../mappers/spydr-node-write.js";

export class PostgresNoteRepository implements INoteRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaNoteMapper()
  ) {}

  async get(criteria: { id: string; orgId?: string; includeDeleted?: boolean }) {
    if (criteria.orgId) {
      return this.findByIdForOrg(criteria.id, criteria.orgId);
    }
    return this.findById(criteria.id);
  }

  async save(entity: NoteNode): Promise<NoteNode> {
    const nodeData = await withNodePersonId(this.db, this.mapper.toPersistence(entity));
    const { id, ...nodeUpdateData } = nodeData;
    const saved = await this.db.spydrNode.upsert({
      where: { id },
      create: nodeData,
      update: nodeUpdateData,
    });

    return this.mapper.toDomain(saved);
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

  private async findById(id: string): Promise<NoteNode | null> {
    const row = await this.db.spydrNode.findUnique({ where: { id } });
    return row && row.nodeType === "note" ? this.mapper.toDomain(row) : null;
  }

  private async findByIdForOrg(id: string, orgId: string): Promise<NoteNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, orgId, nodeType: "note" },
    });

    return row ? this.mapper.toDomain(row) : null;
  }
}
