import { randomUUID } from "node:crypto";
import { PersonDetails, PersonNode } from "../models/index.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";

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

export class PersonMapper {
  toModel(
    userId: string,
    orgId: string,
    input: IPersonCreateModelInput,
    now = new Date(),
    sortOrder?: number
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
      sortOrder,
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
