import type { IRepository } from "../shared/repository.js";
import type { OrganizationInvite } from "./models/organization-invite.js";

export interface IOrganizationInviteGetCriteria {
  id: string;
}

export interface IOrganizationInviteRepository
  extends IRepository<OrganizationInvite>
{
  get(criteria: IOrganizationInviteGetCriteria): Promise<OrganizationInvite | null>;
}
