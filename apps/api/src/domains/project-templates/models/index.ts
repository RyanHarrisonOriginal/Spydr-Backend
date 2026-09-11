import {
  spydrNodeStatuses,
  spydrPriorities,
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";

export type TemplateParameterValueType = "string";

export interface IProjectTemplateParameterProps {
  id: string;
  key: string;
  label: string;
  valueType: TemplateParameterValueType;
  required: boolean;
  defaultValue: string | null;
  sortOrder: number;
}

export class ProjectTemplateParameter implements IProjectTemplateParameterProps {
  id: string;
  key: string;
  label: string;
  valueType: TemplateParameterValueType;
  required: boolean;
  defaultValue: string | null;
  sortOrder: number;

  constructor(props: IProjectTemplateParameterProps) {
    this.id = props.id;
    this.key = props.key;
    this.label = props.label;
    this.valueType = props.valueType;
    this.required = props.required;
    this.defaultValue = props.defaultValue;
    this.sortOrder = props.sortOrder;
  }
}

export interface IProjectTemplateTaskProps {
  id: string;
  titleTemplate: string;
  bodyTemplate: string;
  status: SpydrNodeStatus;
  priority: SpydrPriority;
  dueOffsetDays: number | null;
  estimatedMinutes: number | null;
  tags: string[];
  sortOrder: number;
}

export class ProjectTemplateTask implements IProjectTemplateTaskProps {
  id: string;
  titleTemplate: string;
  bodyTemplate: string;
  status: SpydrNodeStatus;
  priority: SpydrPriority;
  dueOffsetDays: number | null;
  estimatedMinutes: number | null;
  tags: string[];
  sortOrder: number;

  constructor(props: IProjectTemplateTaskProps) {
    this.id = props.id;
    this.titleTemplate = props.titleTemplate;
    this.bodyTemplate = props.bodyTemplate;
    this.status = props.status;
    this.priority = props.priority;
    this.dueOffsetDays = props.dueOffsetDays;
    this.estimatedMinutes = props.estimatedMinutes;
    this.tags = props.tags;
    this.sortOrder = props.sortOrder;
  }
}

export interface IProjectTemplateProps {
  id: string;
  orgId: string;
  createdByUserId: string;
  name: string;
  description: string | null;
  titleTemplate: string;
  bodyTemplate: string;
  outcomeTemplate: string | null;
  status: SpydrNodeStatus;
  priority: SpydrPriority;
  riskLevel: SpydrPriority;
  area: string | null;
  tags: string[];
  sourceProjectNodeId: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  parameters?: ProjectTemplateParameter[];
  tasks?: ProjectTemplateTask[];
}

export interface IProjectTemplateUpdateInput {
  name?: string;
  description?: string | null;
  titleTemplate?: string;
  bodyTemplate?: string;
  outcomeTemplate?: string | null;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
  riskLevel?: SpydrPriority;
  area?: string | null;
  tags?: string[];
  isArchived?: boolean;
  parameters?: IProjectTemplateParameterProps[];
  tasks?: IProjectTemplateTaskProps[];
}

export class ProjectTemplate implements IProjectTemplateProps {
  id: string;
  orgId: string;
  createdByUserId: string;
  name: string;
  description: string | null;
  titleTemplate: string;
  bodyTemplate: string;
  outcomeTemplate: string | null;
  status: SpydrNodeStatus;
  priority: SpydrPriority;
  riskLevel: SpydrPriority;
  area: string | null;
  tags: string[];
  sourceProjectNodeId: string | null;
  isArchived: boolean;
  readonly createdAt: Date;
  updatedAt: Date;
  parameters: ProjectTemplateParameter[];
  tasks: ProjectTemplateTask[];

  constructor(props: IProjectTemplateProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.createdByUserId = props.createdByUserId;
    this.name = props.name;
    this.description = props.description;
    this.titleTemplate = props.titleTemplate;
    this.bodyTemplate = props.bodyTemplate;
    this.outcomeTemplate = props.outcomeTemplate;
    this.status = props.status;
    this.priority = props.priority;
    this.riskLevel = props.riskLevel;
    this.area = props.area;
    this.tags = props.tags;
    this.sourceProjectNodeId = props.sourceProjectNodeId;
    this.isArchived = props.isArchived;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.parameters = props.parameters ?? [];
    this.tasks = props.tasks ?? [];
  }

  applyUpdate(input: IProjectTemplateUpdateInput, now = new Date()): void {
    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) throw new Error("Template name is required");
      this.name = name;
    }
    if (input.description !== undefined) {
      this.description = nullableTrim(input.description);
    }
    if (input.titleTemplate !== undefined) {
      const title = input.titleTemplate.trim();
      if (!title) throw new Error("Template title is required");
      this.titleTemplate = title;
    }
    if (input.bodyTemplate !== undefined) {
      this.bodyTemplate = input.bodyTemplate.trim();
    }
    if (input.outcomeTemplate !== undefined) {
      this.outcomeTemplate = nullableTrim(input.outcomeTemplate);
    }
    if (input.status !== undefined) {
      this.status = normalizeStatus(input.status);
    }
    if (input.priority !== undefined) {
      this.priority = normalizePriority(input.priority);
    }
    if (input.riskLevel !== undefined) {
      this.riskLevel = normalizePriority(input.riskLevel);
    }
    if (input.area !== undefined) {
      this.area = nullableTrim(input.area);
    }
    if (input.tags !== undefined) {
      this.tags = normalizeTags(input.tags);
    }
    if (input.isArchived !== undefined) {
      this.isArchived = input.isArchived;
    }
    if (input.parameters !== undefined) {
      this.replaceParameters(input.parameters);
    }
    if (input.tasks !== undefined) {
      this.replaceTasks(input.tasks);
    }
    this.touch(now);
  }

  archive(now = new Date()): void {
    if (this.isArchived) return;
    this.isArchived = true;
    this.touch(now);
  }

  unarchive(now = new Date()): void {
    if (!this.isArchived) return;
    this.isArchived = false;
    this.touch(now);
  }

  replaceParameters(parameters: IProjectTemplateParameterProps[]): void {
    const seen = new Set<string>();
    this.parameters = parameters.map((param, index) => {
      const key = param.key.trim().toUpperCase();
      if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
        throw new Error(`Invalid parameter key: ${param.key}`);
      }
      if (seen.has(key)) {
        throw new Error(`Duplicate parameter key: ${key}`);
      }
      seen.add(key);
      return new ProjectTemplateParameter({
        id: param.id,
        key,
        label: param.label.trim() || humanizeKey(key),
        valueType: "string",
        required: param.required,
        defaultValue: nullableTrim(param.defaultValue),
        sortOrder: param.sortOrder ?? index,
      });
    });
  }

  replaceTasks(tasks: IProjectTemplateTaskProps[]): void {
    this.tasks = tasks.map((task, index) => {
      const title = task.titleTemplate.trim();
      if (!title) throw new Error("Template task title is required");
      return new ProjectTemplateTask({
        id: task.id,
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

  private touch(now: Date): void {
    this.updatedAt = now;
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

function normalizeStatus(status: SpydrNodeStatus): SpydrNodeStatus {
  if (spydrNodeStatuses.includes(status)) return status;
  throw new Error("Invalid template status");
}

function normalizePriority(priority: SpydrPriority): SpydrPriority {
  if (spydrPriorities.includes(priority)) return priority;
  throw new Error("Invalid template priority");
}

export function humanizeKey(key: string): string {
  return key
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
