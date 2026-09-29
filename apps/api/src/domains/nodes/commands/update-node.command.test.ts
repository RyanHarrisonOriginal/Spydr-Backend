import { describe, expect, it, vi } from "vitest";
import { DomainNode } from "../../shared/models/shared.js";
import { TaskNode } from "../../tasks/models/index.js";
import { UpdateNodeCommand, UpdateNodeCommandHandler } from "./update-node.command.js";

const now = new Date("2026-01-01T00:00:00.000Z");

function taskNode() {
  return new DomainNode({
    id: "task-1",
    orgId: "org-1",
    userId: "user-1",
    nodeType: "task",
    title: "Write brief",
    body: "",
    status: "active",
    priority: "medium",
    area: null,
    tags: [],
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
  });
}

function task() {
  return new TaskNode({
    id: "task-1",
    orgId: "org-1",
    userId: "user-1",
    title: "Write brief",
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

describe("UpdateNodeCommandHandler", () => {
  it("records completion when a task status is set to completed", async () => {
    const existing = task();
    const nodes = {
      get: vi.fn().mockResolvedValue(taskNode()),
      save: vi.fn(),
    };
    const tasks = {
      get: vi.fn().mockResolvedValue(existing),
      save: vi.fn(async (entity: TaskNode) => entity),
    };
    const handler = new UpdateNodeCommandHandler(nodes as never, tasks as never);

    const saved = await handler.execute(
      new UpdateNodeCommand("user-1", "org-1", "task-1", { status: "completed" })
    );

    expect(tasks.save).toHaveBeenCalledWith(existing);
    expect(nodes.save).not.toHaveBeenCalled();
    expect(saved?.status).toBe("completed");
    expect((saved as TaskNode).details?.completedAt).toBeInstanceOf(Date);
  });

  it("updates core fields on a non-task node", async () => {
    const note = new DomainNode({
      id: "note-1",
      orgId: "org-1",
      userId: "user-1",
      nodeType: "note",
      title: "Old",
      body: "",
      status: "active",
      priority: "medium",
      area: null,
      tags: [],
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    });
    const nodes = {
      get: vi.fn().mockResolvedValue(note),
      save: vi.fn(async (entity: DomainNode) => entity),
    };
    const tasks = { get: vi.fn(), save: vi.fn() };
    const handler = new UpdateNodeCommandHandler(nodes as never, tasks as never);

    const saved = await handler.execute(
      new UpdateNodeCommand("user-1", "org-1", "note-1", { title: "Kickoff" })
    );

    expect(saved?.title).toBe("Kickoff");
    expect(tasks.get).not.toHaveBeenCalled();
  });
});
