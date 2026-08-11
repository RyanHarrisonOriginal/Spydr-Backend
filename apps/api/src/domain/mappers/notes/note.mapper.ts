import { randomUUID } from "node:crypto";
import { NoteNode } from "../../models/notes/index.js";
import { resolveNoteTitle } from "../../utils/default-node-title.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../models/shared.js";

export interface INoteUpdateModelInput {
  title?: string;
  body?: string;
}

export interface INoteCreateModelInput {
  title?: string;
  body?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export interface INoteCreateModelContext {
  userId: string;
  orgId: string;
  area?: string | null;
  sortOrder?: number;
}

export class NoteMapper {
  toModel(
    input: INoteCreateModelInput,
    context: INoteCreateModelContext,
    now = new Date()
  ): NoteNode {
    const title = resolveNoteTitle(input.title, now);

    return new NoteNode({
      id: randomUUID(),
      orgId: context.orgId,
      userId: context.userId,
      title,
      body: input.body ?? "",
      status: this.normalizeStatus(input.status),
      priority: this.normalizePriority(input.priority),
      area: context.area ?? null,
      tags: [],
      sortOrder: context.sortOrder,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      isDeleted: false,
      deletedAt: null,
      details: null,
    });
  }

  updateToModel(
    existing: NoteNode,
    input: INoteUpdateModelInput,
    now = new Date()
  ): NoteNode {
    const title = input.title !== undefined ? resolveNoteTitle(input.title, now) : existing.title;

    return new NoteNode({
      id: existing.id,
      orgId: existing.orgId,
      userId: existing.userId,
      title,
      body: input.body !== undefined ? input.body : existing.body,
      status: existing.status,
      priority: existing.priority,
      area: existing.area,
      tags: existing.tags,
      sortOrder: existing.sortOrder,
      createdAt: existing.createdAt,
      updatedAt: now,
      archivedAt: existing.archivedAt,
      isDeleted: existing.isDeleted,
      deletedAt: existing.deletedAt,
      details: null,
    });
  }

  private normalizeStatus(status: SpydrNodeStatus | undefined): SpydrNodeStatus {
    if (!status) return "active";
    if (spydrNodeStatuses.includes(status)) return status;
    throw new Error("Invalid note status");
  }

  private normalizePriority(priority: SpydrPriority | undefined): SpydrPriority {
    if (!priority) return "medium";
    if (spydrPriorities.includes(priority)) return priority;
    throw new Error("Invalid note priority");
  }
}
