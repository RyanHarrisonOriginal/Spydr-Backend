import type { IRepository } from "../shared/repository.js";
import type { ProjectNode } from "./models/index.js";

export type {
  ProjectChildKind,
  IUpdateProjectChildInput,
} from "./models/child.js";

export interface IProjectRepository extends IRepository<ProjectNode> {}

export type ProjectSaveStrategyKey =
  | "standard"
  | "metadata"
  | "withAreaAssignment"
  | "restore";

export interface IProjectAreaAssignmentContext {
  areaNodeId: string | null;
}
