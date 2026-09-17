import { describe, expect, it } from "vitest";
import { ProjectNode } from "./index.js";
import { TaskNode } from "../../tasks/models/index.js";

const now = new Date("2026-09-05T18:00:00.000Z");

function project(targetDate: string | null, tasks: TaskNode[] = []): ProjectNode {
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
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    isDeleted: false,
    deletedAt: null,
    details: {
      outcome: null,
      startDate: null,
      targetDate: targetDate ? new Date(`${targetDate}T00:00:00.000Z`) : null,
      riskLevel: "medium",
      requesterPersonNodeId: null,
      assigneePersonNodeId: null,
      sponsorPersonNodeId: null,
      reviewerPersonNodeId: null,
      sourceTemplateId: null,
      templateParamValues: {},
      templateSyncEnabled: true,
      templateSpawnedAt: null,
      templateSyncedAt: null,
      lastActivityAt: null,
      createdAt: now,
      updatedAt: now,
    },
    tasks,
  });
}

function task(dueDate: string | null): TaskNode {
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
    createdAt: now,
    updatedAt: now,
    archivedAt: null,
    isDeleted: false,
    deletedAt: null,
    details: {
      dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null,
      completedAt: null,
      isBlocked: false,
      estimatedMinutes: null,
      assigneePersonNodeId: null,
      tags: [],
      sourceTemplateTaskId: null,
      createdAt: now,
      updatedAt: now,
    },
  });
}

describe("ProjectNode task due date invariant", () => {
  it("rejects adding a task due after the project target", () => {
    const launch = project("2026-09-20");
    expect(() => launch.addTask(task("2026-09-21"))).toThrow(
      "Invalid task due date: cannot be after the project target date (2026-09-20)"
    );
  });

  it("allows adding a task due on the project target", () => {
    const launch = project("2026-09-20");
    expect(() => launch.addTask(task("2026-09-20"))).not.toThrow();
    expect(launch.tasks).toHaveLength(1);
  });

  it("rejects shrinking the project before an existing task due date", () => {
    const launch = project("2026-09-30", [task("2026-09-20")]);
    expect(() => launch.setTargetDate(new Date("2026-09-10T00:00:00.000Z"))).toThrow(
      "Invalid project date: cannot end before a task is due (2026-09-20)"
    );
  });
});

describe("ProjectNode template param values", () => {
  it("merges new keys onto existing spawn values", () => {
    const launch = project(null);
    launch.bindTemplateSpawn({
      sourceTemplateId: "template-1",
      templateParamValues: { NEW_COMPANY_NAME: "Acme" },
      templateSpawnedAt: now,
    });
    launch.mergeTemplateParamValues({ REGION: "UNSPECIFIED" });
    expect(launch.details?.templateParamValues).toEqual({
      NEW_COMPANY_NAME: "Acme",
      REGION: "UNSPECIFIED",
    });
  });
});
