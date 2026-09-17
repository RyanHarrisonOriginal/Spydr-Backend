import type { ProjectTemplate } from "../models/index.js";
import type { ProjectNode } from "../../projects/models/index.js";
import { TaskMapper } from "../../tasks/mappers/index.js";
import type { TaskStatus } from "../../shared/models/shared.js";
import {
  assertFullyRendered,
  collectTemplateParamKeys,
  fillMissingParamValues,
  renderTemplate,
} from "./interpolate.js";

/**
 * Push the current template blueprint onto an open spawned project.
 * Skips completed/archived tasks; adds missing template tasks; soft-deletes
 * open tasks whose template task was removed.
 */
export function applyTemplateSyncToProject(
  project: ProjectNode,
  template: ProjectTemplate,
  options?: {
    taskMapper?: TaskMapper;
    now?: Date;
    paramValues?: Record<string, string>;
  }
): void {
  if (!project.isOpenForTemplateSync()) return;

  const additions = fillMissingParamValues(
    project.details?.templateParamValues ?? {},
    collectTemplateParamKeys(template),
    options?.paramValues ?? {}
  );
  if (Object.keys(additions).length > 0) {
    project.mergeTemplateParamValues(additions);
  }

  const params = { ...(project.details?.templateParamValues ?? {}) };
  const now = options?.now ?? new Date();
  const taskMapper = options?.taskMapper ?? new TaskMapper();

  const title = renderTemplate(template.titleTemplate, params);
  const body = renderTemplate(template.bodyTemplate, params);
  const outcome = template.outcomeTemplate
    ? renderTemplate(template.outcomeTemplate, params)
    : null;
  const tags = template.tags.map((tag) => renderTemplate(tag, params));

  assertFullyRendered("title", title);
  assertFullyRendered("body", body);
  if (outcome) assertFullyRendered("outcome", outcome);
  tags.forEach((tag, i) => assertFullyRendered(`tag[${i}]`, tag));

  project.applyTemplateSyncProjection(
    {
      title,
      body,
      outcome,
      tags,
      priority: template.priority,
      riskLevel: template.riskLevel,
      area: template.area,
    },
    now
  );

  const spawnAnchor = project.details?.templateSpawnedAt ?? now;
  const spawnDay = spawnAnchor.toISOString().slice(0, 10);
  const templateTaskIds = new Set(template.tasks.map((task) => task.id));

  let nextSort =
    project.tasks.reduce((max, task) => Math.max(max, task.sortOrder ?? 0), 0) +
    1000;

  for (const templateTask of [...template.tasks].sort(
    (a, b) => a.sortOrder - b.sortOrder
  )) {
    const taskTitle = renderTemplate(templateTask.titleTemplate, params);
    const taskBody = renderTemplate(templateTask.bodyTemplate, params);
    const taskTags = templateTask.tags.map((tag) => renderTemplate(tag, params));
    assertFullyRendered("task title", taskTitle);
    assertFullyRendered("task body", taskBody);
    taskTags.forEach((tag, i) => assertFullyRendered(`task tag[${i}]`, tag));

    let dueDate: string | null = null;
    if (templateTask.dueOffsetDays != null) {
      const due = new Date(`${spawnDay}T00:00:00.000Z`);
      due.setUTCDate(due.getUTCDate() + templateTask.dueOffsetDays);
      dueDate = due.toISOString().slice(0, 10);
    }

    const existing = project.findTaskBySourceTemplateTaskId(templateTask.id);
    if (existing) {
      if (!existing.isOpenForTemplateSync()) continue;
      existing.applyUpdate(
        {
          title: taskTitle,
          body: taskBody,
          priority: templateTask.priority,
          dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null,
          estimatedMinutes: templateTask.estimatedMinutes,
        },
        now
      );
      existing.tags = taskTags;
      existing.sortOrder = templateTask.sortOrder;
      existing.details?.setTags(taskTags, now);
      continue;
    }

    const created = taskMapper.toModel(
      {
        title: taskTitle,
        body: taskBody,
        status: templateTask.status as TaskStatus,
        priority: templateTask.priority,
        dueDate,
        estimatedMinutes: templateTask.estimatedMinutes,
        tags: taskTags,
        sourceTemplateTaskId: templateTask.id,
      },
      {
        userId: project.userId,
        orgId: project.orgId,
        area: project.area,
        sortOrder: templateTask.sortOrder ?? nextSort,
      },
      now
    );
    project.addTask(created);
    nextSort += 1000;
  }

  const removable = [...project.tasks].filter((task) => {
    const sourceId = task.details?.sourceTemplateTaskId;
    if (!sourceId) return false;
    if (templateTaskIds.has(sourceId)) return false;
    return task.isOpenForTemplateSync();
  });

  for (const task of removable) {
    project.softDeleteChild("task", task.id, now);
  }
}
