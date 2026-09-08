import type { ProjectAreaNode } from "./models/index.js";
export interface IProjectAreaViews {
  listByOrg(orgId: string): Promise<ProjectAreaNode[]>;
  getByTitle(orgId: string, title: string): Promise<ProjectAreaNode | null>;
}
