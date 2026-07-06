import type { IProjectRepository } from "../../../interfaces/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class ListProjectsQuery implements IQuery<ProjectNode[]> {
  static readonly queryType = "projects.list";
  readonly queryType = ListProjectsQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListProjectsQueryHandler
  implements IQueryHandler<ListProjectsQuery, ProjectNode[]>
{
  readonly queryType = ListProjectsQuery.queryType;

  constructor(private readonly projects: IProjectRepository) {}

  execute(query: ListProjectsQuery): Promise<ProjectNode[]> {
    return this.projects.listByOrg(query.orgId);
  }
}
