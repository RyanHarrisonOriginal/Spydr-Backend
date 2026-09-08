import type { IProjectAreaViews } from "../views.js";
import type { ProjectAreaNode } from "../models/index.js";
import type { IQuery, IQueryHandler } from "../../shared/application/query.js";

export class ListProjectAreasQuery implements IQuery<ProjectAreaNode[]> {
  static readonly queryType = "project-areas.list";
  readonly queryType = ListProjectAreasQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListProjectAreasQueryHandler
  implements IQueryHandler<ListProjectAreasQuery, ProjectAreaNode[]>
{
  readonly queryType = ListProjectAreasQuery.queryType;

  constructor(private readonly projectAreas: IProjectAreaViews) {}

  execute(query: ListProjectAreasQuery): Promise<ProjectAreaNode[]> {
    return this.projectAreas.listByOrg(query.orgId);
  }
}
