import type { DecisionNode } from "../models/decisions/index.js";
import type { IRepository } from "./repository.js";

export interface IDecisionRepository extends IRepository<DecisionNode> {
  listByOrg(orgId: string): Promise<DecisionNode[]>;
  findByIdForOrg(id: string, orgId: string): Promise<DecisionNode | null>;
}
