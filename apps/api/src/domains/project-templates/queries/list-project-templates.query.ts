import type { IProjectTemplateViews } from "../views.js";
import type { IProjectTemplateListItem } from "../views.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class ListProjectTemplatesQuery
  implements IQuery<IProjectTemplateListItem[]>
{
  static readonly queryType = "project-templates.list";
  readonly queryType = ListProjectTemplatesQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly includeArchived = false
  ) {}
}

export class ListProjectTemplatesQueryHandler
  implements
    IQueryHandler<ListProjectTemplatesQuery, IProjectTemplateListItem[]>
{
  readonly queryType = ListProjectTemplatesQuery.queryType;

  constructor(private readonly views: IProjectTemplateViews) {}

  execute(
    query: ListProjectTemplatesQuery
  ): Promise<IProjectTemplateListItem[]> {
    return this.views.listByOrg(query.orgId, {
      includeArchived: query.includeArchived,
    });
  }
}
