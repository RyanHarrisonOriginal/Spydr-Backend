import type { PersonNode } from "./models/index.js";
export interface IPersonViews {
  listByOrg(orgId: string): Promise<PersonNode[]>;
  getById(orgId: string, personId: string): Promise<PersonNode | null>;
  getByClerkUserId(clerkUserId: string): Promise<PersonNode | null>;
  getByEmailInOrg(orgId: string, email: string): Promise<PersonNode | null>;
  nextSortOrderForOrg(orgId: string): Promise<number>;
}
