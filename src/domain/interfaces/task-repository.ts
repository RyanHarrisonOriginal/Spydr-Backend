import type { ITaskUpdateModelInput } from "../mappers/tasks/index.js";
import type { TaskNode } from "../models/tasks/index.js";
import type { IRepository } from "./repository.js";

export interface ITaskProjectRef {
  id: string;
  title: string;
}

export interface ITaskListItem {
  task: TaskNode;
  project: ITaskProjectRef | null;
}

export interface ITaskRepository extends IRepository<TaskNode> {
  listByOrg(orgId: string): Promise<TaskNode[]>;
  listByOrgWithProjects(orgId: string): Promise<ITaskListItem[]>;
  findByIdForOrg(id: string, orgId: string): Promise<TaskNode | null>;
  updateForOrg(
    orgId: string,
    taskId: string,
    input: ITaskUpdateModelInput
  ): Promise<TaskNode | null>;
  assignToProject(
    orgId: string,
    taskId: string,
    projectId: string | null
  ): Promise<ITaskListItem | null>;
  getListItemForOrg(orgId: string, taskId: string): Promise<ITaskListItem | null>;
  saveForProject(entity: TaskNode, projectId: string): Promise<TaskNode>;
}
