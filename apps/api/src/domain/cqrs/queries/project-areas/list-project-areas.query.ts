import type { IProjectAreaRepository } from "../../../interfaces/project-area-repository.js";
import type { ProjectAreaNode } from "../../../models/project-areas/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

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

  constructor(private readonly projectAreas: IProjectAreaRepository) {}

  execute(query: ListProjectAreasQuery): Promise<ProjectAreaNode[]> {
    return this.projectAreas.listByOrg(query.orgId);
  }
}
