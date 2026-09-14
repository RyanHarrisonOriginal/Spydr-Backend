import type { OrganizationInvite } from "./models/organization-invite.js";

export interface IOrganizationInviteViews {
  getByToken(token: string): Promise<OrganizationInvite | null>;
  listPendingByOrg(orgId: string): Promise<OrganizationInvite[]>;
  listPendingByEmails(emails: string[]): Promise<OrganizationInvite[]>;
  findPendingByOrgEmail(orgId: string, email: string): Promise<OrganizationInvite | null>;
}
