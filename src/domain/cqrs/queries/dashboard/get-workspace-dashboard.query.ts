import type { IWorkspaceDashboardRepository } from "../../../interfaces/workspace-dashboard-repository.js";
import type { IWorkspaceDashboard } from "../../../interfaces/workspace-dashboard-repository.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class GetWorkspaceDashboardQuery implements IQuery<IWorkspaceDashboard> {
  static readonly queryType = "dashboard.workspace";
  readonly queryType = GetWorkspaceDashboardQuery.queryType;

  constructor(readonly userId: string) {}
}

export class GetWorkspaceDashboardQueryHandler
  implements IQueryHandler<GetWorkspaceDashboardQuery, IWorkspaceDashboard>
{
  readonly queryType = GetWorkspaceDashboardQuery.queryType;

  constructor(private readonly dashboard: IWorkspaceDashboardRepository) {}

  execute(query: GetWorkspaceDashboardQuery): Promise<IWorkspaceDashboard> {
    return this.dashboard.getForUser(query.userId);
  }
}
