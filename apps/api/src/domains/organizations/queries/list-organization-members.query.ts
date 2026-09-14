import type { IQuery, IQueryHandler } from "../../shared/application/query.js";
import type { IOrganizationViews, IOrganizationMemberView } from "../views.js";
import type { IOrganizationRepository } from "../repository.js";

export class ListOrganizationMembersQuery implements IQuery<IOrganizationMemberView[]> {
  static readonly queryType = "organizations.listMembers";
  readonly queryType = ListOrganizationMembersQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListOrganizationMembersQueryHandler
  implements IQueryHandler<ListOrganizationMembersQuery, IOrganizationMemberView[]>
{
  readonly queryType = ListOrganizationMembersQuery.queryType;

  constructor(
    private readonly organizations: IOrganizationRepository,
    private readonly organizationViews: IOrganizationViews
  ) {}

  async execute(
    query: ListOrganizationMembersQuery
  ): Promise<IOrganizationMemberView[]> {
    const org = await this.organizations.get({
      id: query.orgId,
      userId: query.userId,
    });
    if (!org) {
      throw new Error("Not a member of this organization");
    }

    return this.organizationViews.listMembers(query.orgId);
  }
}
