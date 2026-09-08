import type { DecisionNode } from "./models/index.js";
export interface IDecisionProjectRef { id: string; title: string; }
export interface IDecisionListItem { decision: DecisionNode; project: IDecisionProjectRef | null; }
export interface IDecisionViews {
  listByOrg(orgId: string): Promise<IDecisionListItem[]>;
}
