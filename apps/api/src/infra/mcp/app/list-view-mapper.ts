import type { IProjectResponse } from "../../http/mappers/project-response.mapper.js";
import type { ITaskResponse } from "../../http/mappers/task-response.mapper.js";
import {
  SPYDR_LIST_VIEW_CONTRACT_VERSION,
  type SpydrListViewItem,
  type SpydrListViewResult,
} from "./list-view-contract.js";

type ProjectListSource = Pick<
  IProjectResponse,
  "id" | "title" | "status" | "priority" | "details" | "personas"
>;

type TaskListSource = Pick<
  ITaskResponse,
  "id" | "title" | "status" | "priority" | "details" | "project" | "assignee"
>;

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

export function projectToListItem(project: ProjectListSource): SpydrListViewItem {
  return {
    id: project.id,
    name: project.title,
    status: project.status,
    priority: project.priority,
    assignee: project.personas?.assignee?.title ?? null,
    dueDate: null,
    project: null,
    emoji: project.details?.emoji ?? null,
    target: dateOnly(project.details?.targetDate),
  };
}

export function taskToListItem(task: TaskListSource): SpydrListViewItem {
  return {
    id: task.id,
    name: task.title,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee?.title ?? null,
    dueDate: dateOnly(task.details?.dueDate),
    project: task.project
      ? { id: task.project.id, name: task.project.title }
      : null,
    emoji: task.details?.emoji ?? null,
    target: null,
  };
}

export function toProjectsListView(
  projects: ProjectListSource[]
): SpydrListViewResult {
  return {
    version: SPYDR_LIST_VIEW_CONTRACT_VERSION,
    kind: "projects",
    items: projects.map(projectToListItem),
  };
}

export function toTasksListView(tasks: TaskListSource[]): SpydrListViewResult {
  return {
    version: SPYDR_LIST_VIEW_CONTRACT_VERSION,
    kind: "tasks",
    items: tasks.map(taskToListItem),
  };
}

export interface IListViewPageOptions {
  status?: string;
  /** Case-insensitive substring match on assignee display name; use "unassigned" for none. */
  assignee?: string;
  limit?: number;
  offset?: number;
}

const DEFAULT_LIST_LIMIT = 50;
const MAX_LIST_LIMIT = 100;

export function filterAndPageListView(
  result: SpydrListViewResult,
  options: IListViewPageOptions = {}
): SpydrListViewResult {
  let items = result.items;

  if (options.status) {
    const wanted = options.status.toLowerCase();
    items = items.filter((item) => item.status.toLowerCase() === wanted);
  }

  if (options.assignee) {
    const wanted = options.assignee.trim().toLowerCase();
    items = items.filter((item) => {
      if (wanted === "unassigned") return !item.assignee;
      return (item.assignee ?? "").toLowerCase().includes(wanted);
    });
  }

  const totalMatched = items.length;
  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.min(
    MAX_LIST_LIMIT,
    Math.max(1, options.limit ?? DEFAULT_LIST_LIMIT)
  );
  const page = items.slice(offset, offset + limit);

  return {
    ...result,
    items: page,
    totalMatched,
    offset,
    limit,
  };
}
