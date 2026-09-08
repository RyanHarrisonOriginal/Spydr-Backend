import type { IProjectViews } from "../views.js";
import type { ProjectNode } from "../models/index.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class ListDeletedProjectsQuery implements IQuery<ProjectNode[]> {
  static readonly queryType = "projects.listDeleted";
  readonly queryType = ListDeletedProjectsQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListDeletedProjectsQueryHandler
  implements IQueryHandler<ListDeletedProjectsQuery, ProjectNode[]>
{
  readonly queryType = ListDeletedProjectsQuery.queryType;

  constructor(private readonly projects: IProjectViews) {}

  execute(query: ListDeletedProjectsQuery): Promise<ProjectNode[]> {
    return this.projects.listDeletedByOrg(query.orgId);
  }
}
