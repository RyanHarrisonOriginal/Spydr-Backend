import type { ProjectNode } from "../models/projects/index.js";
import type { IRepository } from "./repository.js";

export type ProjectChildKind = "task" | "note" | "decision" | "idea" | "resource";

export interface IUpdateProjectChildInput {
  title?: string;
  body?: string;
  status?: string;
  priority?: string;
  dueDate?: string | null;
  rationale?: string;
  impact?: string;
  estimatedMinutes?: number | null;
  assigneePersonNodeId?: string | null;
}

export interface IProjectRepository extends IRepository<ProjectNode> {
  listByOrg(orgId: string): Promise<ProjectNode[]>;
  listDeletedByOrg(orgId: string): Promise<ProjectNode[]>;
  findByIdForOrg(id: string, orgId: string): Promise<ProjectNode | null>;
  updateProject(entity: ProjectNode): Promise<ProjectNode>;
  restoreProject(orgId: string, projectId: string): Promise<ProjectNode | null>;
  setAreaAssignment(
    projectId: string,
    orgId: string,
    areaNodeId: string | null
  ): Promise<void>;
  updateRelatedNode(
    orgId: string,
    projectId: string,
    childId: string,
    kind: ProjectChildKind,
    input: IUpdateProjectChildInput
  ): Promise<ProjectNode | null>;
  softDeleteRelatedNode(
    orgId: string,
    projectId: string,
    childId: string,
    kind: ProjectChildKind
  ): Promise<ProjectNode | null>;
  restoreRelatedNode(
    orgId: string,
    projectId: string,
    childId: string,
    kind: ProjectChildKind
  ): Promise<ProjectNode | null>;
}
