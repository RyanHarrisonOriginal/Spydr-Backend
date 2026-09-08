import type { ResourceNode } from "./models/index.js";
export interface IResourceViews {
  listByOrg(orgId: string): Promise<ResourceNode[]>;
}
