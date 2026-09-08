import type { IProjectViews } from "../views.js";
import type { ProjectNode } from "../models/index.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

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

  constructor(private readonly projects: IProjectViews) {}

  execute(query: GetProjectQuery): Promise<ProjectNode | null> {
    return this.projects.getById(query.orgId, query.projectId);
  }
}
