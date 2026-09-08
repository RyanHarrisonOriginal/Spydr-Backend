import { randomUUID } from "node:crypto";
import type { IDomainMapper } from "../../shared/mappers/mapper.js";
import { ProjectNode } from "../models/index.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";

export type ProjectNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  ProjectNode
>;

export interface IProjectCreateModelInput {
  title: string;
  body?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
  area?: string | null;
  tags?: string[];
  outcome?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  riskLevel?: SpydrPriority;
}

export class ProjectMapper {
  toModel(
    userId: string,
    orgId: string,
    input: IProjectCreateModelInput,
    now = new Date(),
    sortOrder?: number
  ): ProjectNode {
    const title = this.nullableTrim(input.title) ?? "";

    if (!title) {
      throw new Error("Project title is required");
    }

    const priority = this.normalizePriority(input.priority);
    const riskLevel = this.normalizePriority(input.riskLevel);

    return new ProjectNode({
      id: randomUUID(),
      orgId,
      userId,
      title,
      body: input.body?.trim() ?? "",
      status: this.normalizeStatus(input.status),
      priority,
      area: this.nullableTrim(input.area),
      tags: this.normalizeTags(input.tags),
      sortOrder,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      isDeleted: false,
      deletedAt: null,
      details: {
        outcome: this.nullableTrim(input.outcome),
        startDate: this.parseDate(input.startDate),
        targetDate: this.parseDate(input.targetDate),
        riskLevel,
        lastActivityAt: null,
        requesterPersonNodeId: null,
        assigneePersonNodeId: null,
        sponsorPersonNodeId: null,
        reviewerPersonNodeId: null,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  private normalizeStatus(status: SpydrNodeStatus | undefined): SpydrNodeStatus {
    if (!status) return "active";
    if (spydrNodeStatuses.includes(status)) return status;
    throw new Error("Invalid project status");
  }

  private normalizePriority(priority: SpydrPriority | undefined): SpydrPriority {
    if (!priority) return "medium";
    if (spydrPriorities.includes(priority)) return priority;
    throw new Error("Invalid project priority");
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private normalizeTags(tags: string[] | undefined): string[] {
    const values = Array.isArray(tags) ? tags : [];

    return Array.from(
      new Set(
        values
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      )
    );
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;

    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new Error("Invalid project date");
    }

    return date;
  }
}
