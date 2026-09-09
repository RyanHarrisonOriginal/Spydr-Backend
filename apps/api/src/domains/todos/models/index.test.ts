import { describe, expect, it } from "vitest";
import { TodoItem } from "./index.js";

function makeItem(overrides: Partial<ConstructorParameters<typeof TodoItem>[0]> = {}) {
  const now = new Date("2026-09-09T12:00:00.000Z");
  return new TodoItem({
    id: "todo-1",
    orgId: "org-1",
    userId: "user-1",
    taskNodeId: "task-1",
    source: "user",
    sortOrder: 0,
    addedAt: now,
    isStale: false,
    staleAt: null,
    removedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

describe("TodoItem", () => {
  it("marks stale once", () => {
    const item = makeItem();
    const at = new Date("2026-09-10T12:00:00.000Z");
    item.markStale(at);
    expect(item.isStale).toBe(true);
    expect(item.staleAt).toEqual(at);

    item.markStale(new Date("2026-09-11T12:00:00.000Z"));
    expect(item.staleAt).toEqual(at);
  });

  it("removes and reactivates", () => {
    const item = makeItem({ isStale: true, staleAt: new Date("2026-09-10T00:00:00.000Z") });
    const removedAt = new Date("2026-09-10T13:00:00.000Z");
    item.remove(removedAt);
    expect(item.isActive).toBe(false);
    expect(item.removedAt).toEqual(removedAt);

    const reactivatedAt = new Date("2026-09-11T08:00:00.000Z");
    item.reactivate("agent", reactivatedAt);
    expect(item.isActive).toBe(true);
    expect(item.source).toBe("agent");
    expect(item.isStale).toBe(false);
    expect(item.staleAt).toBeNull();
    expect(item.addedAt).toEqual(reactivatedAt);
  });

  it("computes age hours", () => {
    const item = makeItem({
      addedAt: new Date("2026-09-09T00:00:00.000Z"),
    });
    expect(item.ageHours(new Date("2026-09-09T05:30:00.000Z"))).toBe(5);
  });
});
