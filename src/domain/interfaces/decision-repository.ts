import type { DecisionNode } from "../models/decisions/index.js";
import type { IRepository } from "./repository.js";

export interface IDecisionRepository extends IRepository<DecisionNode> {
  listByUser(userId: string): Promise<DecisionNode[]>;
  findByIdForUser(id: string, userId: string): Promise<DecisionNode | null>;
}
