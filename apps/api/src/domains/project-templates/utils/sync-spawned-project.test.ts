import { describe, expect, it } from "vitest";
import { ProjectNode } from "../../projects/models/index.js";
import {
  ProjectTemplate,
  ProjectTemplateParameter,
  ProjectTemplateTask,
} from "../models/index.js";
import { applyTemplateSyncToProject } from "./sync-spawned-project.js";
import { UNSPECIFIED_PARAM_VALUE } from "./interpolate.js";

const now = new Date("2026-09-17T15:00:00.000Z");

function spawnedProject(): ProjectNode {
  const project = new ProjectNode({
    id: "project-1",
    orgId: "org-1",
    userId: "user-1",
    title: "Acme Launch",
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
      targetDate: null,
      riskLevel: "medium",
      requesterPersonNodeId: null,
      assigneePersonNodeId: null,
      sponsorPersonNodeId: null,
      reviewerPersonNodeId: null,
      sourceTemplateId: "template-1",
      templateParamValues: { VAR1: "Acme" },
      templateSyncEnabled: true,
      templateSpawnedAt: now,
      templateSyncedAt: now,
      lastActivityAt: null,
      createdAt: now,
      updatedAt: now,
    },
  });
  return project;
}

function templateWithNewTaskVar(): ProjectTemplate {
  return new ProjectTemplate({
    id: "template-1",
    orgId: "org-1",
    createdByUserId: "user-1",
    name: "Go live",
    description: null,
    titleTemplate: "{{VAR1}} Launch",
    bodyTemplate: "",
    outcomeTemplate: null,
    status: "active",
    priority: "medium",
    riskLevel: "medium",
    area: null,
    tags: [],
    sourceProjectNodeId: null,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
    parameters: [
      new ProjectTemplateParameter({
        id: "p1",
        key: "VAR1",
        label: "Var 1",
        valueType: "string",
        required: true,
        defaultValue: null,
        sortOrder: 0,
      }),
      new ProjectTemplateParameter({
        id: "p2",
        key: "VAR2",
        label: "Var 2",
        valueType: "string",
        required: true,
        defaultValue: null,
        sortOrder: 1,
      }),
    ],
    tasks: [
      new ProjectTemplateTask({
        id: "task-template-1",
        titleTemplate: "email {{VAR2}}",
        bodyTemplate: "",
        status: "active",
        priority: "medium",
        dueOffsetDays: null,
        estimatedMinutes: null,
        tags: [],
        sortOrder: 0,
      }),
    ],
  });
}

describe("applyTemplateSyncToProject", () => {
  it("defaults a newly introduced task token to UNSPECIFIED", () => {
    const project = spawnedProject();
    expect(() =>
      applyTemplateSyncToProject(project, templateWithNewTaskVar(), { now })
    ).not.toThrow();
    expect(project.details?.templateParamValues).toEqual({
      VAR1: "Acme",
      VAR2: UNSPECIFIED_PARAM_VALUE,
    });
    expect(project.tasks[0]?.title).toBe(`email ${UNSPECIFIED_PARAM_VALUE}`);
  });

  it("uses provided values for new keys", () => {
    const project = spawnedProject();
    applyTemplateSyncToProject(project, templateWithNewTaskVar(), {
      now,
      paramValues: { VAR2: "west" },
    });
    expect(project.details?.templateParamValues.VAR2).toBe("west");
    expect(project.tasks[0]?.title).toBe("email west");
  });
});
