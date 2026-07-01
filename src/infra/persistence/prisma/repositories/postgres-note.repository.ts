import type { PrismaClient } from "@prisma/client";
import type { INoteRepository } from "../../../../domain/interfaces/index.js";
import type { NoteNode } from "../../../../domain/models/notes/index.js";
import { PrismaNoteMapper } from "../mappers/prisma-note.mapper.js";

export class PostgresNoteRepository implements INoteRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaNoteMapper()
  ) {}

  async findById(id: string): Promise<NoteNode | null> {
    const row = await this.db.spydrNode.findUnique({ where: { id } });
    return row && row.nodeType === "note" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForUser(id: string, userId: string): Promise<NoteNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, userId, nodeType: "note" },
    });

    return row ? this.mapper.toDomain(row) : null;
  }

  async listByUser(userId: string): Promise<NoteNode[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { userId, nodeType: "note", isDeleted: false },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    return rows.map((row) => this.mapper.toDomain(row));
  }

  async save(entity: NoteNode): Promise<NoteNode> {
    const nodeData = this.mapper.toPersistence(entity);
    const { id, ...nodeUpdateData } = nodeData;
    const saved = await this.db.spydrNode.upsert({
      where: { id },
      create: nodeData,
      update: nodeUpdateData,
    });

    return this.mapper.toDomain(saved);
  }

  async delete(id: string): Promise<void> {
    await this.db.spydrNode.delete({ where: { id } });
  }
}
