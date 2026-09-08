import type { IQuery, IQueryHandler } from "../../shared/application/query.js";
import type { ITaskListItem, ITaskViews } from "../views.js";

export class GetTaskQuery implements IQuery<ITaskListItem | null> {
  static readonly queryType = "tasks.get";
  readonly queryType = GetTaskQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly taskId: string
  ) {}
}

export class GetTaskQueryHandler
  implements IQueryHandler<GetTaskQuery, ITaskListItem | null>
{
  readonly queryType = GetTaskQuery.queryType;

  constructor(private readonly taskViews: ITaskViews) {}

  execute(query: GetTaskQuery): Promise<ITaskListItem | null> {
    return this.taskViews.getListItem(query.orgId, query.taskId);
  }
}
