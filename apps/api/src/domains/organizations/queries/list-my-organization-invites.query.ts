import type { IQuery, IQueryHandler } from "../../shared/application/query.js";
import type { IOrganizationInviteViews } from "../invite-views.js";
import type { OrganizationInvite } from "../models/organization-invite.js";

export class ListMyOrganizationInvitesQuery implements IQuery<OrganizationInvite[]> {
  static readonly queryType = "organizations.listMyInvites";
  readonly queryType = ListMyOrganizationInvitesQuery.queryType;

  constructor(readonly emails: string[]) {}
}

export class ListMyOrganizationInvitesQueryHandler
  implements IQueryHandler<ListMyOrganizationInvitesQuery, OrganizationInvite[]>
{
  readonly queryType = ListMyOrganizationInvitesQuery.queryType;

  constructor(private readonly inviteViews: IOrganizationInviteViews) {}

  execute(query: ListMyOrganizationInvitesQuery): Promise<OrganizationInvite[]> {
    return this.inviteViews.listPendingByEmails(query.emails);
  }
}
