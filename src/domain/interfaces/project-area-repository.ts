import type { ProjectAreaNode } from "../models/project-areas/index.js";
import type { IRepository } from "./repository.js";

export interface IProjectAreaRepository extends IRepository<ProjectAreaNode> {
  listByUser(userId: string): Promise<ProjectAreaNode[]>;
  findByIdForUser(id: string, userId: string): Promise<ProjectAreaNode | null>;
  findByTitleForUser(
    userId: string,
    title: string
  ): Promise<ProjectAreaNode | null>;
  clearProjectsUsingArea(userId: string, areaTitle: string): Promise<void>;
}
