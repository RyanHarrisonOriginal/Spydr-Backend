import { describe, expect, it } from "vitest";
import type { ProjectNode } from "../models/projects/index.js";
import {
  ACTIVE_NOTE_CATALOG_ALL_THRESHOLD,
  ACTIVE_NOTE_CATALOG_SCORED_LIMIT,
} from "./types.js";
import { selectProjectCatalog } from "./context.js";

function makeProject(id: string, title: string, body = ""): ProjectNode {
  return {
    id,
    orgId: "org-1",
    userId: "user-1",
    nodeType: "project",
    title,
    body: body || `${title} body`,
    status: "active",
    priority: "medium",
    area: null,
    tags: [],
    sortOrder: 0,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
    archivedAt: null,
    isDeleted: false,
    deletedAt: null,
    details: null,
    personas: null,
    tasks: [],
    decisions: [],
    ideas: [],
    notes: [],
    resources: [],
    deletedTasks: [],
    deletedDecisions: [],
    deletedIdeas: [],
    deletedNotes: [],
    deletedResources: [],
  } as unknown as ProjectNode;
}

describe("selectProjectCatalog", () => {
  it("hydrates all active projects when count is at or below the threshold", () => {
    const projects = Array.from({ length: 10 }, (_, index) =>
      makeProject(`proj-${index}`, `Project ${index}`)
    );

    const catalog = selectProjectCatalog("unrelated note text", projects);

    expect(catalog).toHaveLength(10);
    expect(catalog.every((entry) => entry.relevanceReason === "Active project in catalog")).toBe(
      true
    );
  });

  it("caps scored catalog at 15 when active projects exceed the threshold", () => {
    const projects = Array.from({ length: 25 }, (_, index) =>
      makeProject(`proj-${index}`, `Project ${index}`)
    );

    const catalog = selectProjectCatalog("Vital Pak QuickBooks data", projects);

    expect(projects.length).toBeGreaterThan(ACTIVE_NOTE_CATALOG_ALL_THRESHOLD);
    expect(catalog).toHaveLength(ACTIVE_NOTE_CATALOG_SCORED_LIMIT);
  });
});
