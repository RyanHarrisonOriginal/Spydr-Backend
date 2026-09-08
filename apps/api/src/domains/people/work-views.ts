import type { ProjectNode } from "../projects/models/index.js";
import type { TaskNode } from "../tasks/models/index.js";
import type { ITaskProjectRef } from "../tasks/views.js";
import type { PersonProjectRole } from "../shared/utils/person-project-roles.js";

export interface IPersonWorkProjectEntry {
  project: ProjectNode;
  roles: PersonProjectRole[];
  /** Open tasks assigned to this person on the project. */
  openTaskCount: number;
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

/** Person work is a read projection, not a write repository. */
export interface IPersonWorkRepository {
  getWork(orgId: string, personNodeId: string): Promise<IPersonWork | null>;
  getEligibleNodeIds(
    orgId: string,
    personNodeId: string,
    nodeType: "project" | "task"
  ): Promise<string[]>;
}
