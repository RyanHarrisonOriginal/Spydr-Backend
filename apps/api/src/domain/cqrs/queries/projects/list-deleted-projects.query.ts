import type { IProjectRepository } from "../../../interfaces/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

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

  constructor(private readonly projects: IProjectRepository) {}

  execute(query: ListDeletedProjectsQuery): Promise<ProjectNode[]> {
    return this.projects.listDeletedByOrg(query.orgId);
  }
}
