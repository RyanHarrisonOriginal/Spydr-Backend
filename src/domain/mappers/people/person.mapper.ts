import { randomUUID } from "node:crypto";
import { PersonDetails, PersonNode } from "../../models/people/index.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../models/shared.js";

export interface IPersonCreateModelInput {
  fullName: string;
  body?: string;
  email?: string | null;
  title?: string | null;
  organization?: string | null;
  relationshipContext?: string | null;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export interface IPersonUpdateModelInput {
  fullName?: string;
  body?: string;
  email?: string | null;
  title?: string | null;
  organization?: string | null;
  relationshipContext?: string | null;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export class PersonMapper {
  toModel(
    userId: string,
    orgId: string,
    input: IPersonCreateModelInput,
    now = new Date()
  ): PersonNode {
    const fullName = input.fullName.trim();
    if (!fullName) {
      throw new Error("Person full name is required");
    }

    return new PersonNode({
      id: randomUUID(),
      orgId,
      userId,
      title: fullName,
      body: input.body?.trim() ?? "",
      status: this.normalizeStatus(input.status),
      priority: this.normalizePriority(input.priority),
      area: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      isDeleted: false,
      deletedAt: null,
      details: new PersonDetails({
        fullName,
        email: this.nullableTrim(input.email),
        title: this.nullableTrim(input.title),
        organization: this.nullableTrim(input.organization),
        relationshipContext: this.nullableTrim(input.relationshipContext),
        createdAt: now,
        updatedAt: now,
      }),
    });
  }

  updateToModel(
    existing: PersonNode,
    input: IPersonUpdateModelInput,
    now = new Date()
  ): PersonNode {
    const fullName = input.fullName?.trim() ?? existing.details?.fullName ?? existing.title;
    if (!fullName) {
      throw new Error("Person full name is required");
    }

    return new PersonNode({
      id: existing.id,
      orgId: existing.orgId,
      userId: existing.userId,
      title: fullName,
      body: input.body ?? existing.body,
      status:
        input.status !== undefined
          ? this.normalizeStatus(input.status)
          : existing.status,
      priority:
        input.priority !== undefined
          ? this.normalizePriority(input.priority)
          : existing.priority,
      area: existing.area,
      tags: existing.tags,
      createdAt: existing.createdAt,
      updatedAt: now,
      archivedAt: existing.archivedAt,
      isDeleted: existing.isDeleted,
      deletedAt: existing.deletedAt,
      details: new PersonDetails({
        fullName,
        email:
          input.email !== undefined
            ? this.nullableTrim(input.email)
            : existing.details?.email ?? null,
        title:
          input.title !== undefined
            ? this.nullableTrim(input.title)
            : existing.details?.title ?? null,
        organization:
          input.organization !== undefined
            ? this.nullableTrim(input.organization)
            : existing.details?.organization ?? null,
        relationshipContext:
          input.relationshipContext !== undefined
            ? this.nullableTrim(input.relationshipContext)
            : existing.details?.relationshipContext ?? null,
        createdAt: existing.details?.createdAt ?? now,
        updatedAt: now,
      }),
    });
  }

  private normalizeStatus(status: SpydrNodeStatus | undefined): SpydrNodeStatus {
    if (!status) return "active";
    if (spydrNodeStatuses.includes(status)) return status;
    throw new Error("Invalid person status");
  }

  private normalizePriority(priority: SpydrPriority | undefined): SpydrPriority {
    if (!priority) return "medium";
    if (spydrPriorities.includes(priority)) return priority;
    throw new Error("Invalid person priority");
  }

  private nullableTrim(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
