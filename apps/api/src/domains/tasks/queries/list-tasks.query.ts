import type { IQuery, IQueryHandler } from "../../shared/application/query.js";
import type { ITaskListItem, ITaskViews } from "../views.js";

export class ListTasksQuery implements IQuery<ITaskListItem[]> {
  static readonly queryType = "tasks.list";
  readonly queryType = ListTasksQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListTasksQueryHandler
  implements IQueryHandler<ListTasksQuery, ITaskListItem[]>
{
  readonly queryType = ListTasksQuery.queryType;

  constructor(private readonly taskViews: ITaskViews) {}

  execute(query: ListTasksQuery): Promise<ITaskListItem[]> {
    return this.taskViews.listByOrg(query.orgId);
  }
}
