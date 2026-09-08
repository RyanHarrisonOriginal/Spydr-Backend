import type { IdeaNode } from "./models/index.js";
export interface IIdeaViews {
  listByOrg(orgId: string): Promise<IdeaNode[]>;
}
