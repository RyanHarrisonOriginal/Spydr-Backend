import { randomUUID } from "node:crypto";
import { DecisionNode } from "../../models/decisions/index.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../models/shared.js";

export interface IDecisionUpdateModelInput {
  title?: string;
  body?: string;
  rationale?: string;
  impact?: string;
}

export interface IDecisionCreateModelInput {
  title: string;
  body?: string;
  rationale?: string;
  impact?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export interface IDecisionCreateModelContext {
  userId: string;
  orgId: string;
  area?: string | null;
  sortOrder?: number;
}

export class DecisionMapper {
  toModel(
    input: IDecisionCreateModelInput,
    context: IDecisionCreateModelContext,
    now = new Date()
  ): DecisionNode {
    const title = input.title?.trim();
    if (!title) {
      throw new Error("Decision title is required");
    }

    return new DecisionNode({
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
        rationale: input.rationale?.trim() ?? input.body?.trim() ?? "",
        impact: input.impact?.trim() ?? "",
        decidedAt: now,
        supersedesDecisionNodeId: null,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  updateToModel(
    existing: DecisionNode,
    input: IDecisionUpdateModelInput,
    now = new Date()
  ): DecisionNode {
    const title = input.title?.trim() ?? existing.title;
    if (!title) {
      throw new Error("Decision title is required");
    }

    return new DecisionNode({
      id: existing.id,
      orgId: existing.orgId,
      userId: existing.userId,
      title,
      body: input.body !== undefined ? input.body.trim() : existing.body,
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
      details: {
        rationale:
          input.rationale?.trim() ??
          existing.details?.rationale ??
          existing.body,
        impact: input.impact?.trim() ?? existing.details?.impact ?? "",
        decidedAt: existing.details?.decidedAt ?? now,
        supersedesDecisionNodeId:
          existing.details?.supersedesDecisionNodeId ?? null,
        createdAt: existing.details?.createdAt ?? now,
        updatedAt: now,
      },
    });
  }

  private normalizeStatus(status: SpydrNodeStatus | undefined): SpydrNodeStatus {
    if (!status) return "active";
    if (spydrNodeStatuses.includes(status)) return status;
    throw new Error("Invalid decision status");
  }

  private normalizePriority(priority: SpydrPriority | undefined): SpydrPriority {
    if (!priority) return "medium";
    if (spydrPriorities.includes(priority)) return priority;
    throw new Error("Invalid decision priority");
  }
}
