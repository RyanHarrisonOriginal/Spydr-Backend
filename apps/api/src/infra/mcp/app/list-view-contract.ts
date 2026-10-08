/**
 * Spydr MCP Apps list-view contract.
 *
 * Shared by `get_projects` / `get_tasks` `structuredContent` and the
 * `ui://spydr/list-view` App. This type is the UI↔server contract — bump
 * {@link SPYDR_LIST_VIEW_CONTRACT_VERSION} on breaking shape changes.
 */

export const SPYDR_LIST_VIEW_CONTRACT_VERSION = 1 as const;

/** MCP resource URI for the shared projects/tasks list App. */
export const SPYDR_LIST_VIEW_RESOURCE_URI = "ui://spydr/list-view" as const;

export type SpydrListViewKind = "projects" | "tasks";

export interface SpydrListViewProjectRef {
  id: string;
  name: string;
}

/**
 * Flat row for both project and task lists.
 *
 * - Projects: `project` and `dueDate` are null; `target` is the target date.
 * - Tasks: `target` is null; `dueDate` and `project` are populated when known.
 */
export interface SpydrListViewItem {
  id: string;
  name: string;
  status: string;
  priority: string;
  /** Display name of the assignee, if any. */
  assignee: string | null;
  /** Task due date (`YYYY-MM-DD`). Null for projects. */
  dueDate: string | null;
  /** Parent project for tasks. Null for projects. */
  project: SpydrListViewProjectRef | null;
  emoji: string | null;
  /** Project target date (`YYYY-MM-DD`). Null for tasks. */
  target: string | null;
}

export interface SpydrListViewResult {
  version: typeof SPYDR_LIST_VIEW_CONTRACT_VERSION;
  kind: SpydrListViewKind;
  items: SpydrListViewItem[];
}

export function isSpydrListViewResult(
  value: unknown
): value is SpydrListViewResult {
  if (value === null || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === SPYDR_LIST_VIEW_CONTRACT_VERSION &&
    (record.kind === "projects" || record.kind === "tasks") &&
    Array.isArray(record.items)
  );
}
