import type { PrismaClient } from "@prisma/client";
import type {
  INoteListItem,
  INoteRepository,
} from "../../../../domain/interfaces/index.js";
import type { ITaskProjectRef } from "../../../../domain/interfaces/task-repository.js";
import { NoteMapper } from "../../../../domain/mappers/notes/note.mapper.js";
import type { INoteUpdateModelInput } from "../../../../domain/mappers/notes/note.mapper.js";
import type { NoteNode } from "../../../../domain/models/notes/index.js";
import { PrismaNoteMapper } from "../mappers/prisma-note.mapper.js";

export class PostgresNoteRepository implements INoteRepository {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaNoteMapper(),
    private readonly domainMapper = new NoteMapper()
  ) {}

  async findById(id: string): Promise<NoteNode | null> {
    const row = await this.db.spydrNode.findUnique({ where: { id } });
    return row && row.nodeType === "note" ? this.mapper.toDomain(row) : null;
  }

  async findByIdForOrg(id: string, orgId: string): Promise<NoteNode | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id, orgId, nodeType: "note" },
    });

    return row ? this.mapper.toDomain(row) : null;
  }

  async listByOrg(orgId: string): Promise<NoteNode[]> {
    const items = await this.listByOrgWithProjects(orgId);
    return items.map((item) => item.note);
  }

  async listByOrgWithProjects(orgId: string): Promise<INoteListItem[]> {
    const rows = await this.db.spydrNode.findMany({
      where: { orgId, nodeType: "note", isDeleted: false },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
    });

    if (rows.length === 0) return [];

    const notes = rows.map((row) => this.mapper.toDomain(row));
    const noteIds = notes.map((note) => note.id);
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        orgId,
        targetNodeId: { in: noteIds },
        relationshipType: "related_to",
      },
      select: { sourceNodeId: true, targetNodeId: true },
    });

    const projectIds = Array.from(
      new Set(relationships.map((relationship) => relationship.sourceNodeId))
    );
    const projectRows =
      projectIds.length === 0
        ? []
        : await this.db.spydrNode.findMany({
            where: {
              orgId,
              id: { in: projectIds },
              nodeType: "project",
              isDeleted: false,
            },
            select: { id: true, title: true },
          });

    const projectById = new Map<string, ITaskProjectRef>(
      projectRows.map((project) => [project.id, { id: project.id, title: project.title }])
    );
    const projectByNoteId = new Map<string, ITaskProjectRef>();

    for (const relationship of relationships) {
      const project = projectById.get(relationship.sourceNodeId);
      if (project) {
        projectByNoteId.set(relationship.targetNodeId, project);
      }
    }

    return notes.map((note) => ({
      note,
      project: projectByNoteId.get(note.id) ?? null,
    }));
  }

  async getListItemForOrg(
    orgId: string,
    noteId: string
  ): Promise<INoteListItem | null> {
    const note = await this.findByIdForOrg(noteId, orgId);
    if (!note || note.isDeleted) return null;

    return {
      note,
      project: await this.findProjectForNote(orgId, noteId),
    };
  }

  async updateForOrg(
    orgId: string,
    noteId: string,
    input: INoteUpdateModelInput
  ): Promise<NoteNode | null> {
    const existing = await this.findByIdForOrg(noteId, orgId);
    if (!existing || existing.isDeleted) return null;

    const updated = this.domainMapper.updateToModel(existing, input);
    return this.save(updated);
  }

  private async findProjectForNote(
    orgId: string,
    noteId: string
  ): Promise<ITaskProjectRef | null> {
    const relationships = await this.db.spydrNodeRelationship.findMany({
      where: {
        orgId,
        targetNodeId: noteId,
        relationshipType: "related_to",
      },
      select: { sourceNodeId: true },
    });

    if (relationships.length === 0) return null;

    const project = await this.db.spydrNode.findFirst({
      where: {
        orgId,
        id: { in: relationships.map((relationship) => relationship.sourceNodeId) },
        nodeType: "project",
        isDeleted: false,
      },
      select: { id: true, title: true },
    });

    return project ? { id: project.id, title: project.title } : null;
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
    await this.db.spydrNode.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
}
