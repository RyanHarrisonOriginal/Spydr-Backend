import { describe, expect, it } from "vitest";
import {
  projectToListItem,
  taskToListItem,
  toProjectsListView,
  toTasksListView,
} from "./list-view-mapper.js";
import { summarizeListView } from "./summarize-list-view.js";

describe("list-view-mapper", () => {
  it("maps a project summary into a list item", () => {
    const item = projectToListItem({
      id: "p1",
      title: "Launch",
      status: "active",
      priority: "high",
      details: {
        emoji: "🚀",
        outcome: null,
        startDate: null,
        targetDate: "2026-06-01T00:00:00.000Z",
        riskLevel: "medium",
        lastActivityAt: null,
        requesterPersonNodeId: null,
        assigneePersonNodeId: null,
        sponsorPersonNodeId: null,
        reviewerPersonNodeId: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      personas: {
        requester: null,
        assignee: {
          id: "person-1",
          userId: "user-1",
          organizationId: "org-1",
          nodeType: "person",
          title: "Ada Lovelace",
          body: "",
          status: "active",
          priority: "medium",
          tags: [],
          sortOrder: 0,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          archivedAt: null,
          details: null,
        },
        sponsor: null,
        reviewer: null,
      },
    });

    expect(item).toEqual({
      id: "p1",
      name: "Launch",
      status: "active",
      priority: "high",
      assignee: "Ada Lovelace",
      dueDate: null,
      project: null,
      emoji: "🚀",
      target: "2026-06-01",
    });
  });

  it("maps a task into a list item", () => {
    const item = taskToListItem({
      id: "t1",
      title: "Ship docs",
      status: "active",
      priority: "medium",
      project: { id: "p1", title: "Launch" },
      assignee: null,
      details: {
        emoji: null,
        dueDate: "2026-04-01",
        completedAt: null,
        isBlocked: false,
        estimatedMinutes: null,
        assigneePersonNodeId: null,
        tags: [],
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    expect(item).toEqual({
      id: "t1",
      name: "Ship docs",
      status: "active",
      priority: "medium",
      assignee: null,
      dueDate: "2026-04-01",
      project: { id: "p1", name: "Launch" },
      emoji: null,
      target: null,
    });
  });

  it("builds versioned list results", () => {
    expect(toProjectsListView([]).kind).toBe("projects");
    expect(toTasksListView([]).kind).toBe("tasks");
    expect(toProjectsListView([]).version).toBe(1);
  });
});

describe("summarizeListView", () => {
  it("writes a concise empty and non-empty summary", () => {
    expect(summarizeListView({ version: 1, kind: "tasks", items: [] })).toBe(
      "No tasks found."
    );
    const summary = summarizeListView({
      version: 1,
      kind: "projects",
      items: [
        {
          id: "p1",
          name: "Launch",
          status: "active",
          priority: "high",
          assignee: null,
          dueDate: null,
          project: null,
          emoji: "🚀",
          target: "2026-06-01",
        },
      ],
    });
    expect(summary).toContain("1 project:");
    expect(summary).toContain("By status (all matched): active=1");
    expect(summary).toContain("🚀 Launch · active · high · target 2026-06-01");
  });

  it("calls out pagination when truncated", () => {
    const summary = summarizeListView({
      version: 1,
      kind: "tasks",
      items: [
        {
          id: "t1",
          name: "One",
          status: "active",
          priority: "low",
          assignee: "Ada",
          dueDate: null,
          project: null,
          emoji: null,
          target: null,
        },
      ],
      totalMatched: 315,
      limit: 50,
      offset: 0,
    });
    expect(summary).toContain("Showing 1 of 315 tasks");
    expect(summary).toContain("status/assignee filters");
  });
});

describe("filterAndPageListView", () => {
  it("filters by status and assignee and pages", async () => {
    const { filterAndPageListView } = await import("./list-view-mapper.js");
    const page = filterAndPageListView(
      {
        version: 1,
        kind: "tasks",
        items: [
          {
            id: "1",
            name: "A",
            status: "active",
            priority: "low",
            assignee: "Ada",
            dueDate: null,
            project: null,
            emoji: null,
            target: null,
          },
          {
            id: "2",
            name: "B",
            status: "active",
            priority: "low",
            assignee: null,
            dueDate: null,
            project: null,
            emoji: null,
            target: null,
          },
          {
            id: "3",
            name: "C",
            status: "completed",
            priority: "low",
            assignee: "Ada",
            dueDate: null,
            project: null,
            emoji: null,
            target: null,
          },
        ],
      },
      { status: "active", assignee: "ada", limit: 10, offset: 0 }
    );
    expect(page.totalMatched).toBe(1);
    expect(page.items.map((item) => item.id)).toEqual(["1"]);
    expect(page.limit).toBe(10);
  });
});
