import { randomUUID } from "node:crypto";
import {
  humanizeKey,
  ProjectTemplate,
  ProjectTemplateParameter,
  ProjectTemplateTask,
  type IProjectTemplateParameterProps,
  type IProjectTemplateTaskProps,
} from "../models/index.js";
import { extractTemplateKeys } from "../utils/interpolate.js";
import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";

export interface ICreateProjectTemplateInput {
  name: string;
  description?: string | null;
  titleTemplate: string;
  bodyTemplate?: string;
  outcomeTemplate?: string | null;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
  riskLevel?: SpydrPriority;
  area?: string | null;
  tags?: string[];
  parameters?: Array<Partial<IProjectTemplateParameterProps> & { key: string }>;
  tasks?: Array<
    Partial<IProjectTemplateTaskProps> & { titleTemplate: string }
  >;
}

export interface ICreateProjectTemplateFromProjectInput {
  name: string;
  description?: string | null;
  /** Task node ids to include; omit/empty = all non-deleted tasks on project. */
  taskIds?: string[];
}

export interface IProjectSnapshotForTemplate {
  id: string;
  title: string;
  body: string;
  status: SpydrNodeStatus;
  priority: SpydrPriority;
  area: string | null;
  tags: string[];
  outcome: string | null;
  riskLevel: SpydrPriority;
  tasks: Array<{
    id: string;
    title: string;
    body: string;
    status: SpydrNodeStatus;
    priority: SpydrPriority;
    tags: string[];
    estimatedMinutes: number | null;
  }>;
}

export class ProjectTemplateMapper {
  toModel(
    userId: string,
    orgId: string,
    input: ICreateProjectTemplateInput,
    now = new Date()
  ): ProjectTemplate {
    const name = input.name.trim();
    if (!name) throw new Error("Template name is required");

    const titleTemplate = input.titleTemplate.trim();
    if (!titleTemplate) throw new Error("Template title is required");

    const templateId = randomUUID();
    const parameters = this.toParameters(input.parameters ?? []);
    const tasks = this.toTasks(input.tasks ?? []);

    return new ProjectTemplate({
      id: templateId,
      orgId,
      createdByUserId: userId,
      name,
      description: nullableTrim(input.description),
      titleTemplate,
      bodyTemplate: input.bodyTemplate?.trim() ?? "",
      outcomeTemplate: nullableTrim(input.outcomeTemplate),
      status: normalizeStatus(input.status),
      priority: normalizePriority(input.priority),
      riskLevel: normalizePriority(input.riskLevel),
      area: nullableTrim(input.area),
      tags: normalizeTags(input.tags),
      sourceProjectNodeId: null,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      parameters,
      tasks,
    });
  }

  toModelFromProject(
    userId: string,
    orgId: string,
    project: IProjectSnapshotForTemplate,
    input: ICreateProjectTemplateFromProjectInput,
    now = new Date()
  ): ProjectTemplate {
    const name = input.name.trim();
    if (!name) throw new Error("Template name is required");

    const selectedTasks =
      input.taskIds && input.taskIds.length > 0
        ? project.tasks.filter((task) => input.taskIds!.includes(task.id))
        : project.tasks;

    const templateId = randomUUID();
    const titleTemplate = project.title;
    const bodyTemplate = project.body;
    const outcomeTemplate = project.outcome;
    const tagTemplates = project.tags;

    const keys = extractTemplateKeys(
      titleTemplate,
      bodyTemplate,
      outcomeTemplate,
      ...tagTemplates,
      ...selectedTasks.flatMap((task) => [task.title, task.body, ...task.tags])
    );

    const parameters = keys.map(
      (key, index) =>
        new ProjectTemplateParameter({
          id: randomUUID(),
          key,
          label: humanizeKey(key),
          valueType: "string",
          required: true,
          defaultValue: null,
          sortOrder: index,
        })
    );

    const tasks = selectedTasks.map(
      (task, index) =>
        new ProjectTemplateTask({
          id: randomUUID(),
          titleTemplate: task.title,
          bodyTemplate: task.body,
          status: normalizeStatus(task.status),
          priority: normalizePriority(task.priority),
          dueOffsetDays: null,
          estimatedMinutes: task.estimatedMinutes,
          tags: task.tags,
          sortOrder: index,
        })
    );

    return new ProjectTemplate({
      id: templateId,
      orgId,
      createdByUserId: userId,
      name,
      description: nullableTrim(input.description),
      titleTemplate,
      bodyTemplate,
      outcomeTemplate: nullableTrim(outcomeTemplate),
      status: normalizeStatus(project.status),
      priority: normalizePriority(project.priority),
      riskLevel: normalizePriority(project.riskLevel),
      area: nullableTrim(project.area),
      tags: tagTemplates,
      sourceProjectNodeId: project.id,
      isArchived: false,
      createdAt: now,
      updatedAt: now,
      parameters,
      tasks,
    });
  }

  private toParameters(
    input: Array<Partial<IProjectTemplateParameterProps> & { key: string }>
  ): ProjectTemplateParameter[] {
    const parameters = input.map((param, index) => {
      const key = param.key.trim().toUpperCase();
      if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
        throw new Error(`Invalid parameter key: ${param.key}`);
      }
      return new ProjectTemplateParameter({
        id: param.id ?? randomUUID(),
        key,
        label: (param.label ?? "").trim() || humanizeKey(key),
        valueType: "string",
        required: param.required ?? true,
        defaultValue: nullableTrim(param.defaultValue),
        sortOrder: param.sortOrder ?? index,
      });
    });

    const seen = new Set<string>();
    for (const param of parameters) {
      if (seen.has(param.key)) {
        throw new Error(`Duplicate parameter key: ${param.key}`);
      }
      seen.add(param.key);
    }
    return parameters;
  }

  private toTasks(
    input: Array<Partial<IProjectTemplateTaskProps> & { titleTemplate: string }>
  ): ProjectTemplateTask[] {
    return input.map((task, index) => {
      const title = task.titleTemplate.trim();
      if (!title) throw new Error("Template task title is required");
      return new ProjectTemplateTask({
        id: task.id ?? randomUUID(),
        titleTemplate: title,
        bodyTemplate: task.bodyTemplate?.trim() ?? "",
        status: normalizeStatus(task.status),
        priority: normalizePriority(task.priority),
        dueOffsetDays: task.dueOffsetDays ?? null,
        estimatedMinutes: task.estimatedMinutes ?? null,
        tags: normalizeTags(task.tags),
        sortOrder: task.sortOrder ?? index,
      });
    });
  }
}

function nullableTrim(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeTags(tags: string[] | undefined): string[] {
  const values = Array.isArray(tags) ? tags : [];
  return Array.from(
    new Set(values.map((tag) => tag.trim()).filter((tag) => tag.length > 0))
  );
}

function normalizeStatus(status: SpydrNodeStatus | undefined): SpydrNodeStatus {
  if (!status) return "active";
  if (spydrNodeStatuses.includes(status)) return status;
  return "active";
}

function normalizePriority(priority: SpydrPriority | undefined): SpydrPriority {
  if (!priority) return "medium";
  if (spydrPriorities.includes(priority)) return priority;
  return "medium";
}
