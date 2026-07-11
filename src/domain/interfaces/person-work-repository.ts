import type { ProjectNode } from "../models/projects/index.js";
import type { TaskNode } from "../models/tasks/index.js";
import type { ITaskProjectRef } from "./task-repository.js";
import type { PersonProjectRole } from "../utils/person-project-roles.js";

export interface IPersonWorkProjectEntry {
  project: ProjectNode;
  roles: PersonProjectRole[];
  sortOrder: number;
  personSortOrder: number | null;
  globalRank: number;
  personRank: number;
}

export interface IPersonWorkTaskEntry {
  task: TaskNode;
  project: ITaskProjectRef | null;
  sortOrder: number;
  personSortOrder: number | null;
  globalRank: number;
  personRank: number;
}

export interface IPersonWork {
  projects: IPersonWorkProjectEntry[];
  tasks: IPersonWorkTaskEntry[];
}

export interface IPersonWorkRepository {
  getWork(orgId: string, personNodeId: string): Promise<IPersonWork | null>;
  getEligibleNodeIds(
    orgId: string,
    personNodeId: string,
    nodeType: "project" | "task"
  ): Promise<string[]>;
}
