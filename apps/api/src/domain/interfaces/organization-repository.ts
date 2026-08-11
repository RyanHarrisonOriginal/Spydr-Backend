import type { Organization, OrganizationMemberRole } from "../models/organizations/index.js";

export interface ICreateOrganizationInput {
  name: string;
}

export interface IOrganizationRepository {
  listForUser(userId: string): Promise<Organization[]>;
  findByIdForUser(id: string, userId: string): Promise<Organization | null>;
  isMember(userId: string, orgId: string): Promise<boolean>;
  getMemberRole(userId: string, orgId: string): Promise<OrganizationMemberRole | null>;
  createForUser(userId: string, input: ICreateOrganizationInput): Promise<Organization>;
}
