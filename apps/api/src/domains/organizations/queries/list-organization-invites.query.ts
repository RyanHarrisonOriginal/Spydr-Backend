import type { IQuery, IQueryHandler } from "../../shared/application/query.js";
import type { IOrganizationInviteViews } from "../invite-views.js";
import type { IOrganizationRepository } from "../repository.js";
import type { OrganizationInvite } from "../models/organization-invite.js";

export class ListOrganizationInvitesQuery implements IQuery<OrganizationInvite[]> {
  static readonly queryType = "organizations.listInvites";
  readonly queryType = ListOrganizationInvitesQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListOrganizationInvitesQueryHandler
  implements IQueryHandler<ListOrganizationInvitesQuery, OrganizationInvite[]>
{
  readonly queryType = ListOrganizationInvitesQuery.queryType;

  constructor(
    private readonly organizations: IOrganizationRepository,
    private readonly inviteViews: IOrganizationInviteViews
  ) {}

  async execute(query: ListOrganizationInvitesQuery): Promise<OrganizationInvite[]> {
    const org = await this.organizations.get({
      id: query.orgId,
      userId: query.userId,
    });
    if (!org) {
      throw new Error("Not a member of this organization");
    }
    if (!org.canManageMembers()) {
      throw new Error("You do not have permission to list invites");
    }

    return this.inviteViews.listPendingByOrg(query.orgId);
  }
}
