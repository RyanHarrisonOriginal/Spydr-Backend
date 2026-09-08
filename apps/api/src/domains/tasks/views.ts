import type { TaskNode } from "./models/index.js";

export interface ITaskProjectRef {
  id: string;
  title: string;
}

export interface ITaskListItem {
  task: TaskNode;
  project: ITaskProjectRef | null;
}

/** Read projections for task queries. Not a write repository. */
export interface ITaskViews {
  listByOrg(orgId: string): Promise<ITaskListItem[]>;
  getListItem(orgId: string, taskId: string): Promise<ITaskListItem | null>;
}
