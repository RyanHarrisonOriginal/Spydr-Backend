import type { ProjectTemplate } from "./models/index.js";

export interface IProjectTemplateListItem {
  id: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  area: string | null;
  parameterCount: number;
  taskCount: number;
  updatedAt: Date;
}

/** Read projections for project template queries. */
export interface IProjectTemplateViews {
  listByOrg(
    orgId: string,
    options?: { includeArchived?: boolean }
  ): Promise<IProjectTemplateListItem[]>;
  getDetail(orgId: string, templateId: string): Promise<ProjectTemplate | null>;
}
