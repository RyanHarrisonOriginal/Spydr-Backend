import type { IQuery, IQueryHandler } from "../../shared/application/query.js";
import type { ITodoListItem, ITodoViews } from "../views.js";

export class ListTodoItemsQuery implements IQuery<ITodoListItem[]> {
  static readonly queryType = "todos.list";
  readonly queryType = ListTodoItemsQuery.queryType;

  constructor(
    readonly userId: string,
    readonly orgId: string
  ) {}
}

export class ListTodoItemsQueryHandler
  implements IQueryHandler<ListTodoItemsQuery, ITodoListItem[]>
{
  readonly queryType = ListTodoItemsQuery.queryType;

  constructor(private readonly views: ITodoViews) {}

  execute(query: ListTodoItemsQuery): Promise<ITodoListItem[]> {
    return this.views.listActiveByUser(query.orgId, query.userId);
  }
}
