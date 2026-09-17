import type { ProjectNode } from "./models/index.js";

/** Open spawned project connected to a source template. */
export interface ISourceTemplateProject {
  id: string;
  title: string;
}

/** Read projections for project queries. */
export interface IProjectViews {
  listByOrg(orgId: string): Promise<ProjectNode[]>;
  listDeletedByOrg(orgId: string): Promise<ProjectNode[]>;
  getById(orgId: string, projectId: string): Promise<ProjectNode | null>;
  /** Open (non-completed/archived), sync-enabled projects spawned from a template. */
  listOpenBySourceTemplate(
    orgId: string,
    templateId: string
  ): Promise<ISourceTemplateProject[]>;
}
