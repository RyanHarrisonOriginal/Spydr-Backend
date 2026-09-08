import type { IOrganizationViews } from "../views.js";
import type { Organization } from "../models/index.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class ListOrganizationsQuery implements IQuery<Organization[]> {
  static readonly queryType = "organizations.list";
  readonly queryType = ListOrganizationsQuery.queryType;

  constructor(readonly userId: string) {}
}

export class ListOrganizationsQueryHandler
  implements IQueryHandler<ListOrganizationsQuery, Organization[]>
{
  readonly queryType = ListOrganizationsQuery.queryType;

  constructor(private readonly organizationViews: IOrganizationViews) {}

  async execute(query: ListOrganizationsQuery): Promise<Organization[]> {
    return this.organizationViews.listForUser(query.userId);
  }
}
