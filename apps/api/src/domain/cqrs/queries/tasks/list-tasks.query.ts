import type { ITaskRepository, ITaskListItem } from "../../../interfaces/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

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

  constructor(private readonly tasks: ITaskRepository) {}

  execute(query: ListTasksQuery): Promise<ITaskListItem[]> {
    return this.tasks.listByOrgWithProjects(query.orgId);
  }
}
