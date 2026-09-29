import { describe, expect, it, vi } from "vitest";
import { ProjectNode } from "../models/index.js";
import {
  AddTasksToProjectCommand,
  AddTasksToProjectCommandHandler,
} from "./add-tasks-to-project.command.js";

const now = new Date("2026-01-01T00:00:00.000Z");

function project() {
  return new ProjectNode({
    id: "project-1",
    orgId: "org-1",
    userId: "user-1",
    title: "Launch",
    body: "",
    status: "active",
    priority: "medium",
    area: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    details: null,
  });
}

describe("AddTasksToProjectCommandHandler", () => {
  it("adds every task in one save, in order", async () => {
    const existing = project();
    const projects = {
      get: vi.fn().mockResolvedValue(existing),
      save: vi.fn(async (entity: ProjectNode) => entity),
    };
    const people = { get: vi.fn() };
    const nodeViews = { nextSortOrderForOrg: vi.fn().mockResolvedValue(2000) };
    const handler = new AddTasksToProjectCommandHandler(
      projects as never,
      people as never,
      nodeViews as never
    );

    const created = await handler.execute(
      new AddTasksToProjectCommand("user-1", "org-1", "project-1", [
        { title: "Write brief" },
        { title: "Review brief" },
      ])
    );

    expect(projects.save).toHaveBeenCalledTimes(1);
    expect(created?.map((task) => task.title)).toEqual([
      "Write brief",
      "Review brief",
    ]);
    expect(created?.map((task) => task.sortOrder)).toEqual([2000, 3000]);
    expect(existing.tasks.map((task) => task.title)).toEqual([
      "Write brief",
      "Review brief",
    ]);
  });

  it("returns null when the project is missing", async () => {
    const projects = { get: vi.fn().mockResolvedValue(null), save: vi.fn() };
    const handler = new AddTasksToProjectCommandHandler(
      projects as never,
      { get: vi.fn() } as never,
      { nextSortOrderForOrg: vi.fn() } as never
    );

    await expect(
      handler.execute(
        new AddTasksToProjectCommand("user-1", "org-1", "missing", [
          { title: "Write brief" },
        ])
      )
    ).resolves.toBeNull();
    expect(projects.save).not.toHaveBeenCalled();
  });
});
