import type { ProjectAreaNode } from "../models/project-areas/index.js";
import type { IRepository } from "./repository.js";

export interface IProjectAreaRepository extends IRepository<ProjectAreaNode> {
  listByOrg(orgId: string): Promise<ProjectAreaNode[]>;
  findByIdForOrg(id: string, orgId: string): Promise<ProjectAreaNode | null>;
  findByTitleForOrg(
    orgId: string,
    title: string
  ): Promise<ProjectAreaNode | null>;
  clearProjectsUsingArea(orgId: string, areaTitle: string): Promise<void>;
}
