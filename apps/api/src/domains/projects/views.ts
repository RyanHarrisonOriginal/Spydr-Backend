import type { ProjectNode } from "./models/index.js";

/** Read projections for project queries. */
export interface IProjectViews {
  listByOrg(orgId: string): Promise<ProjectNode[]>;
  listDeletedByOrg(orgId: string): Promise<ProjectNode[]>;
  getById(orgId: string, projectId: string): Promise<ProjectNode | null>;
}
