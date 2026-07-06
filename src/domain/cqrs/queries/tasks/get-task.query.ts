import type { ITaskListItem, ITaskRepository } from "../../../interfaces/task-repository.js";
import type { IQuery, IQueryHandler } from "../query.js";

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

  constructor(private readonly tasks: ITaskRepository) {}

  execute(query: GetTaskQuery): Promise<ITaskListItem | null> {
    return this.tasks.getListItemForOrg(query.orgId, query.taskId);
  }
}
