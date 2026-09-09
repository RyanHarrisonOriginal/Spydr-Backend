import type { ITaskListItem } from "../tasks/views.js";
import type { TodoItem } from "./models/index.js";

export interface ITodoListItem {
  item: TodoItem;
  task: ITaskListItem;
}

/** Read projections for todo queries. Not a write repository. */
export interface ITodoViews {
  listActiveByUser(orgId: string, userId: string): Promise<ITodoListItem[]>;
  /** Includes soft-removed memberships (for reactivation). */
  getByTask(
    orgId: string,
    userId: string,
    taskNodeId: string
  ): Promise<TodoItem | null>;
  getListItem(
    orgId: string,
    userId: string,
    todoId: string
  ): Promise<ITodoListItem | null>;
}
