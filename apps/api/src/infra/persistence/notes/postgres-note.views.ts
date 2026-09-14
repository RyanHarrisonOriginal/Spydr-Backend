import type { PrismaClient } from "@prisma/client";
import type {
  INoteListItem,
  INoteProjectRef,
  INoteViews,
} from "../../../domains/notes/views.js";
import { PrismaNoteMapper } from "../prisma/mappers/prisma-note.mapper.js";

export class PostgresNoteViews implements INoteViews {
  constructor(
    private readonly db: PrismaClient,
    private readonly mapper = new PrismaNoteMapper()
  ) {}

  async listByOrg(orgId: string): Promise<INoteListItem[]> {
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

    const projectById = new Map<string, INoteProjectRef>(
      projectRows.map((project) => [project.id, { id: project.id, title: project.title }])
    );
    const projectByNoteId = new Map<string, INoteProjectRef>();

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

  async getListItem(
    orgId: string,
    noteId: string
  ): Promise<INoteListItem | null> {
    const row = await this.db.spydrNode.findFirst({
      where: { id: noteId, orgId, nodeType: "note", isDeleted: false },
    });
    if (!row) return null;

    return {
      note: this.mapper.toDomain(row),
      project: await this.findProjectForNote(orgId, noteId),
    };
  }

  private async findProjectForNote(
    orgId: string,
    noteId: string
  ): Promise<INoteProjectRef | null> {
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
}
