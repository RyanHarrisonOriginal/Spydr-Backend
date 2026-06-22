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
}

export interface IProjectRepository extends IRepository<ProjectNode> {
  listByUser(userId: string): Promise<ProjectNode[]>;
  findByIdForUser(id: string, userId: string): Promise<ProjectNode | null>;
  updateRelatedNode(
    userId: string,
    projectId: string,
    childId: string,
    kind: ProjectChildKind,
    input: IUpdateProjectChildInput
  ): Promise<ProjectNode | null>;
  softDeleteRelatedNode(
    userId: string,
    projectId: string,
    childId: string,
    kind: ProjectChildKind
  ): Promise<ProjectNode | null>;
  restoreRelatedNode(
    userId: string,
    projectId: string,
    childId: string,
    kind: ProjectChildKind
  ): Promise<ProjectNode | null>;
}
