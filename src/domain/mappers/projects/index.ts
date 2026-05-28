import { randomUUID } from "node:crypto";
import type { IDomainMapper } from "../mapper.js";
import { ProjectNode } from "../../models/projects/index.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../models/shared.js";

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

export interface IProjectUpdateModelInput {
  body?: string;
  startDate?: string | null;
  targetDate?: string | null;
  riskLevel?: SpydrPriority;
}

export class ProjectMapper {
  toModel(
    userId: string,
    input: IProjectCreateModelInput,
    now?: Date
  ): ProjectNode;
  toModel(
    existing: ProjectNode,
    input: IProjectUpdateModelInput,
    now?: Date
  ): ProjectNode;
  toModel(
    subject: string | ProjectNode,
    input: IProjectCreateModelInput | IProjectUpdateModelInput,
    now = new Date()
  ): ProjectNode {
    if (typeof subject === "string") {
      return this.createToModel(subject, input as IProjectCreateModelInput, now);
    }

    return this.updateToModel(subject, input as IProjectUpdateModelInput, now);
  }

  private createToModel(
    userId: string,
    input: IProjectCreateModelInput,
    now: Date
  ): ProjectNode {
    const title = this.nullableTrim(input.title) ?? "";

    if (!title) {
      throw new Error("Project title is required");
    }

    const priority = this.normalizePriority(input.priority);
    const riskLevel = this.normalizePriority(input.riskLevel);

    return new ProjectNode({
      id: randomUUID(),
      userId,
      title,
      body: input.body?.trim() ?? "",
      status: this.normalizeStatus(input.status),
      priority,
      area: this.nullableTrim(input.area),
      tags: this.normalizeTags(input.tags),
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      details: {
        outcome: this.nullableTrim(input.outcome),
        startDate: this.parseDate(input.startDate),
        targetDate: this.parseDate(input.targetDate),
        riskLevel,
        lastActivityAt: null,
        createdAt: now,
        updatedAt: now,
      },
    });
  }

  private updateToModel(
    existing: ProjectNode,
    input: IProjectUpdateModelInput,
    now: Date
  ): ProjectNode {
    const riskLevel = this.normalizePriority(
      input.riskLevel ?? existing.details?.riskLevel ?? "medium"
    );

    return new ProjectNode({
      id: existing.id,
      userId: existing.userId,
      title: existing.title,
      body: input.body ?? existing.body,
      status: existing.status,
      priority: existing.priority,
      area: existing.area,
      tags: existing.tags,
      createdAt: existing.createdAt,
      updatedAt: now,
      archivedAt: existing.archivedAt,
      details: {
        outcome: existing.details?.outcome ?? null,
        startDate:
          input.startDate !== undefined
            ? this.parseDate(input.startDate)
            : existing.details?.startDate ?? null,
        targetDate:
          input.targetDate !== undefined
            ? this.parseDate(input.targetDate)
            : existing.details?.targetDate ?? null,
        riskLevel,
        lastActivityAt: existing.details?.lastActivityAt ?? null,
        createdAt: existing.details?.createdAt ?? now,
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
