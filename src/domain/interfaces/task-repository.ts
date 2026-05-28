import type { TaskNode } from "../models/tasks/index.js";
import type { IRepository } from "./repository.js";

export interface ITaskRepository extends IRepository<TaskNode> {
  listByUser(userId: string): Promise<TaskNode[]>;
  findByIdForUser(id: string, userId: string): Promise<TaskNode | null>;
  saveForProject(entity: TaskNode, projectId: string): Promise<TaskNode>;
}
