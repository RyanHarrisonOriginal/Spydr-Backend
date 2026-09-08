import type { IRepository } from "../shared/repository.js";
import type { TaskNode } from "./models/index.js";

export interface ITaskRepository extends IRepository<TaskNode> {}

export type TaskSaveStrategyKey =
  | "standard"
  | "withProjectLink"
  | "assignProject"
  | "complete";

export interface ITaskWithProjectLinkContext {
  projectId: string;
}

export interface ITaskAssignProjectContext {
  orgId: string;
  projectId: string | null;
}
