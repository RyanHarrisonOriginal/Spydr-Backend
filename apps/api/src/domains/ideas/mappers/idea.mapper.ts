import { randomUUID } from "node:crypto";
import { IdeaNode } from "../../ideas/models/index.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";

export interface IIdeaUpdateModelInput {
  title?: string;
  body?: string;
}

export interface IIdeaCreateModelInput {
  title: string;
  body?: string;
  confidence?: number | null;
  potentialValue?: SpydrPriority;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export interface IIdeaCreateModelContext {
  userId: string;
  orgId: string;
  area?: string | null;
  sortOrder?: number;
}

export class IdeaMapper {
  toModel(
    input: IIdeaCreateModelInput,
    context: IIdeaCreateModelContext,
    now = new Date()
  ): IdeaNode {
    const title = input.title?.trim();
    if (!title) {
      throw new Error("Idea title is required");
    }

    return new IdeaNode({
      id: randomUUID(),
      orgId: context.orgId,
      userId: context.userId,
      title,
      body: input.body?.trim() ?? "",
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
      details: {
        confidence: input.confidence ?? null,
        potentialValue: this.normalizePriority(input.potentialValue),
        promotedToProjectNodeId: null,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  updateToModel(existing: IdeaNode, input: IIdeaUpdateModelInput, now = new Date()): IdeaNode {
    existing.applyUpdate(input, now);
    return existing;
  }

  private normalizeStatus(status: SpydrNodeStatus | undefined): SpydrNodeStatus {
    if (!status) return "active";
    if (spydrNodeStatuses.includes(status)) return status;
    throw new Error("Invalid idea status");
  }

  private normalizePriority(priority: SpydrPriority | undefined): SpydrPriority {
    if (!priority) return "medium";
    if (spydrPriorities.includes(priority)) return priority;
    throw new Error("Invalid idea priority");
  }
}
