import type { Organization, OrganizationMemberRole } from "./models/index.js";

export interface IOrganizationMemberPersonView {
  id: string;
  fullName: string;
  email: string | null;
  clerkUserId: string | null;
}

export interface IOrganizationMemberView {
  id: string;
  organizationId: string;
  userId: string;
  personId: string | null;
  role: OrganizationMemberRole;
  createdAt: Date;
  person: IOrganizationMemberPersonView | null;
}

export interface IOrganizationViews {
  listForUser(userId: string): Promise<Organization[]>;
  isMember(userId: string, orgId: string): Promise<boolean>;
  getMemberRole(userId: string, orgId: string): Promise<OrganizationMemberRole | null>;
  listMembers(orgId: string): Promise<IOrganizationMemberView[]>;
  getMemberById(
    orgId: string,
    memberId: string
  ): Promise<IOrganizationMemberView | null>;
  getMemberByUserId(
    orgId: string,
    userId: string
  ): Promise<IOrganizationMemberView | null>;
}
