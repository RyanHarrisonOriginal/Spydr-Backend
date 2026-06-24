import { randomUUID } from "node:crypto";
import {
  DEFAULT_PROJECT_AREA_COLOR,
  ProjectAreaDetails,
  ProjectAreaNode,
} from "../../models/project-areas/index.js";
import { normalizeProjectAreaColor } from "../../models/project-areas/details.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../models/shared.js";

export interface IProjectAreaCreateModelInput {
  title: string;
  body?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
  color?: string;
}

export class ProjectAreaMapper {
  toModel(
    userId: string,
    input: IProjectAreaCreateModelInput,
    now = new Date()
  ): ProjectAreaNode {
    const title = input.title.trim();
    if (!title) {
      throw new Error("Project area title is required");
    }

    const color = normalizeProjectAreaColor(
      input.color,
      DEFAULT_PROJECT_AREA_COLOR
    );

    return new ProjectAreaNode({
      id: randomUUID(),
      userId,
      title,
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
      details: new ProjectAreaDetails({
        color,
        createdAt: now,
        updatedAt: now,
      }),
    });
  }

  private normalizeStatus(status: SpydrNodeStatus | undefined): SpydrNodeStatus {
    if (!status) return "active";
    if (spydrNodeStatuses.includes(status)) return status;
    throw new Error("Invalid project area status");
  }

  private normalizePriority(priority: SpydrPriority | undefined): SpydrPriority {
    if (!priority) return "medium";
    if (spydrPriorities.includes(priority)) return priority;
    throw new Error("Invalid project area priority");
  }
}
