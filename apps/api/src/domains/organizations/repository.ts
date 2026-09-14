import type { Organization } from "./models/index.js";
import type { OrganizationMemberRole } from "./models/index.js";

export interface ICreateOrganizationInput {
  name: string;
}

export interface IAddOrganizationMemberContext {
  userId: string;
  personId?: string | null;
  role?: OrganizationMemberRole;
}

export interface ILinkMemberPersonContext {
  userId: string;
  personId: string;
}

export interface IRemoveOrganizationMemberContext {
  memberId: string;
}

export type OrganizationSaveContext =
  | IAddOrganizationMemberContext
  | ILinkMemberPersonContext
  | IRemoveOrganizationMemberContext
  | { userId: string };

export interface IOrganizationRepository {
  get(criteria: {
    id: string;
    userId?: string;
  }): Promise<Organization | null>;
  save(
    entity: Organization | ICreateOrganizationInput,
    options?: {
      strategy?: string;
      context?: OrganizationSaveContext;
    }
  ): Promise<Organization>;
  delete(id: string): Promise<void>;
}
