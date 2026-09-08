import type { Organization, OrganizationMemberRole } from "./models/index.js";

export interface IOrganizationViews {
  listForUser(userId: string): Promise<Organization[]>;
  isMember(userId: string, orgId: string): Promise<boolean>;
  getMemberRole(userId: string, orgId: string): Promise<OrganizationMemberRole | null>;
}
