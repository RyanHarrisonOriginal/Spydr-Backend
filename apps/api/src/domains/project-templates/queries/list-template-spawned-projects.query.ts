import type { IProjectTemplateViews } from "../views.js";
import type {
  IProjectViews,
  ISourceTemplateProject,
} from "../../projects/views.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class ListTemplateSpawnedProjectsQuery
  implements IQuery<ISourceTemplateProject[] | null>
{
  static readonly queryType = "project-templates.list-spawned-projects";
  readonly queryType = ListTemplateSpawnedProjectsQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly templateId: string
  ) {}
}

export class ListTemplateSpawnedProjectsQueryHandler
  implements
    IQueryHandler<
      ListTemplateSpawnedProjectsQuery,
      ISourceTemplateProject[] | null
    >
{
  readonly queryType = ListTemplateSpawnedProjectsQuery.queryType;

  constructor(
    private readonly templates: IProjectTemplateViews,
    private readonly projects: IProjectViews
  ) {}

  async execute(
    query: ListTemplateSpawnedProjectsQuery
  ): Promise<ISourceTemplateProject[] | null> {
    const template = await this.templates.getDetail(
      query.orgId,
      query.templateId
    );
    if (!template) return null;
    return this.projects.listOpenBySourceTemplate(
      query.orgId,
      query.templateId
    );
  }
}
