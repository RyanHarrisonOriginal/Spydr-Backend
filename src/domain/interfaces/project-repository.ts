import type { ProjectNode } from "../models/projects/index.js";
import type { IRepository } from "./repository.js";

export interface IProjectRepository extends IRepository<ProjectNode> {
  listByUser(userId: string): Promise<ProjectNode[]>;
  findByIdForUser(id: string, userId: string): Promise<ProjectNode | null>;
}
