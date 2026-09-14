import type { IQuery, IQueryHandler } from "../../shared/application/query.js";
import type { IOrganizationInviteViews } from "../invite-views.js";
import type { OrganizationInvite } from "../models/organization-invite.js";

export class GetOrganizationInviteQuery implements IQuery<OrganizationInvite | null> {
  static readonly queryType = "organizations.getInvite";
  readonly queryType = GetOrganizationInviteQuery.queryType;

  constructor(readonly token: string) {}
}

export class GetOrganizationInviteQueryHandler
  implements IQueryHandler<GetOrganizationInviteQuery, OrganizationInvite | null>
{
  readonly queryType = GetOrganizationInviteQuery.queryType;

  constructor(private readonly inviteViews: IOrganizationInviteViews) {}

  execute(query: GetOrganizationInviteQuery): Promise<OrganizationInvite | null> {
    return this.inviteViews.getByToken(query.token);
  }
}
