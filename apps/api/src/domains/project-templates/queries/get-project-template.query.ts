import type { IProjectTemplateViews } from "../views.js";
import type { ProjectTemplate } from "../models/index.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class GetProjectTemplateQuery
  implements IQuery<ProjectTemplate | null>
{
  static readonly queryType = "project-templates.get";
  readonly queryType = GetProjectTemplateQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly templateId: string
  ) {}
}

export class GetProjectTemplateQueryHandler
  implements IQueryHandler<GetProjectTemplateQuery, ProjectTemplate | null>
{
  readonly queryType = GetProjectTemplateQuery.queryType;

  constructor(private readonly views: IProjectTemplateViews) {}

  execute(query: GetProjectTemplateQuery): Promise<ProjectTemplate | null> {
    return this.views.getDetail(query.orgId, query.templateId);
  }
}
