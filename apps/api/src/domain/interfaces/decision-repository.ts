import type { DecisionNode } from "../models/decisions/index.js";
import type { ITaskProjectRef } from "./task-repository.js";
import type { IRepository } from "./repository.js";

export interface IDecisionListItem {
  decision: DecisionNode;
  project: ITaskProjectRef | null;
}

export interface IDecisionRepository extends IRepository<DecisionNode> {
  listByOrg(orgId: string): Promise<DecisionNode[]>;
  listByOrgWithProjects(orgId: string): Promise<IDecisionListItem[]>;
  findByIdForOrg(id: string, orgId: string): Promise<DecisionNode | null>;
}
