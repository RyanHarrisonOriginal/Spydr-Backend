import type { ITaskRepository } from "../../../interfaces/index.js";
import type { TaskNode } from "../../../models/tasks/index.js";
import type { IQuery, IQueryHandler } from "../query.js";

export class ListTasksQuery implements IQuery<TaskNode[]> {
  static readonly queryType = "tasks.list";
  readonly queryType = ListTasksQuery.queryType;

  constructor(readonly userId: string) {}
}

export class ListTasksQueryHandler
  implements IQueryHandler<ListTasksQuery, TaskNode[]>
{
  readonly queryType = ListTasksQuery.queryType;

  constructor(private readonly tasks: ITaskRepository) {}

  execute(query: ListTasksQuery): Promise<TaskNode[]> {
    return this.tasks.listByUser(query.userId);
  }
}
