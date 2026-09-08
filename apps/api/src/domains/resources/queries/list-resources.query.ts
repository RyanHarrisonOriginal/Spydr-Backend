import type { IResourceViews } from "../views.js";
import type { ResourceNode } from "../models/index.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class ListResourcesQuery implements IQuery<ResourceNode[]> {
  static readonly queryType = "resources.list";
  readonly queryType = ListResourcesQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListResourcesQueryHandler
  implements IQueryHandler<ListResourcesQuery, ResourceNode[]>
{
  readonly queryType = ListResourcesQuery.queryType;

  constructor(private readonly resources: IResourceViews) {}

  execute(query: ListResourcesQuery): Promise<ResourceNode[]> {
    return this.resources.listByOrg(query.orgId);
  }
}
