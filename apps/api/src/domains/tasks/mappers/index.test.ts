import { describe, expect, it } from "vitest";
import { TaskMapper } from "./index.js";
import { TaskNode } from "../models/index.js";

const mapper = new TaskMapper();
const now = new Date("2026-09-05T18:00:00.000Z");
const earlier = new Date("2026-09-01T12:00:00.000Z");

function baseTask(overrides?: Partial<ConstructorParameters<typeof TaskNode>[0]>): TaskNode {
  return new TaskNode({
    id: "task-1",
    orgId: "org-1",
    userId: "user-1",
    title: "Ship it",
    body: "",
    status: "active",
    priority: "medium",
    area: null,
    tags: [],
    sortOrder: 0,
    createdAt: earlier,
    updatedAt: earlier,
    archivedAt: null,
    isDeleted: false,
    deletedAt: null,
    details: {
      dueDate: null,
      completedAt: null,
      isBlocked: false,
      estimatedMinutes: null,
      assigneePersonNodeId: null,
      tags: [],
      createdAt: earlier,
      updatedAt: earlier,
    },
    ...overrides,
  });
}

describe("TaskMapper create completedAt invariant", () => {
  it("stamps completedAt when creating a completed task", () => {
    const task = mapper.toModel(
      { title: "Done already", status: "completed" },
      { userId: "user-1", orgId: "org-1" },
      now
    );

    expect(task.status).toBe("completed");
    expect(task.details?.completedAt).toEqual(now);
  });

  it("leaves completedAt null when creating an open task", () => {
    const task = mapper.toModel(
      { title: "Open work" },
      { userId: "user-1", orgId: "org-1" },
      now
    );

    expect(task.status).toBe("active");
    expect(task.details?.completedAt).toBeNull();
  });
});

describe("TaskNode applyUpdate completedAt invariant", () => {
  it("stamps completedAt when status becomes completed", () => {
    const task = baseTask();
    task.applyUpdate({ status: "completed" }, now);

    expect(task.status).toBe("completed");
    expect(task.details?.completedAt).toEqual(now);
  });

  it("preserves completedAt when already completed", () => {
    const existing = baseTask({
      status: "completed",
      details: {
        dueDate: null,
        completedAt: earlier,
        isBlocked: false,
        estimatedMinutes: null,
        assigneePersonNodeId: null,
        tags: [],
        createdAt: earlier,
        updatedAt: earlier,
      },
    });

    existing.applyUpdate({ title: "Renamed" }, now);

    expect(existing.status).toBe("completed");
    expect(existing.details?.completedAt).toEqual(earlier);
  });

  it("heals missing completedAt while status stays completed", () => {
    const existing = baseTask({
      status: "completed",
      details: {
        dueDate: null,
        completedAt: null,
        isBlocked: false,
        estimatedMinutes: null,
        assigneePersonNodeId: null,
        tags: [],
        createdAt: earlier,
        updatedAt: earlier,
      },
    });

    existing.applyUpdate({ title: "Still done" }, now);

    expect(existing.details?.completedAt).toEqual(now);
  });

  it("clears completedAt when reopening a completed task", () => {
    const existing = baseTask({
      status: "completed",
      details: {
        dueDate: null,
        completedAt: earlier,
        isBlocked: false,
        estimatedMinutes: null,
        assigneePersonNodeId: null,
        tags: [],
        createdAt: earlier,
        updatedAt: earlier,
      },
    });

    existing.applyUpdate({ status: "active" }, now);

    expect(existing.status).toBe("active");
    expect(existing.details?.completedAt).toBeNull();
  });

  it("complete() stamps completedAt", () => {
    const task = baseTask();
    task.complete(now);

    expect(task.status).toBe("completed");
    expect(task.details?.completedAt).toEqual(now);
  });
});
