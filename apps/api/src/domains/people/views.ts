import type { PersonNode } from "./models/index.js";
export interface IPersonViews {
  listByOrg(orgId: string): Promise<PersonNode[]>;
  getById(orgId: string, personId: string): Promise<PersonNode | null>;
}
