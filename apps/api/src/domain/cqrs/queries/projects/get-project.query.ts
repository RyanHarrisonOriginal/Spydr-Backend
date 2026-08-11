import type { IProjectRepository } from "../../../interfaces/index.js";
import type { ProjectNode } from "../../../models/projects/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class GetProjectQuery implements IQuery<ProjectNode | null> {
  static readonly queryType = "projects.get";
  readonly queryType = GetProjectQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string
  ) {}
}

export class GetProjectQueryHandler
  implements IQueryHandler<GetProjectQuery, ProjectNode | null>
{
  readonly queryType = GetProjectQuery.queryType;

  constructor(private readonly projects: IProjectRepository) {}

  execute(query: GetProjectQuery): Promise<ProjectNode | null> {
    return this.projects.findByIdForOrg(query.projectId, query.orgId);
  }
}
