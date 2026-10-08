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
