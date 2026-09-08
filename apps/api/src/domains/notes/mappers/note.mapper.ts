import { randomUUID } from "node:crypto";
import { NoteNode } from "../../notes/models/index.js";
import { resolveNoteTitle } from "../../shared/utils/default-node-title.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";

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
    existing.applyUpdate(input, now);
    return existing;
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
