import type { IOrganizationRepository } from "../../../interfaces/organization-repository.js";
import type { Organization } from "../../../models/organizations/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class ListOrganizationsQuery implements IQuery<Organization[]> {
  static readonly queryType = "organizations.list";
  readonly queryType = ListOrganizationsQuery.queryType;

  constructor(readonly userId: string) {}
}

export class ListOrganizationsQueryHandler
  implements IQueryHandler<ListOrganizationsQuery, Organization[]>
{
  readonly queryType = ListOrganizationsQuery.queryType;

  constructor(private readonly organizations: IOrganizationRepository) {}

  async execute(query: ListOrganizationsQuery): Promise<Organization[]> {
    return this.organizations.listForUser(query.userId);
  }
}
