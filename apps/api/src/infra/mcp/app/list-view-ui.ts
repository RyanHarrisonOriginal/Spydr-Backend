import type { SpydrListViewResult } from "./list-view-contract.js";
import { mcpAppsEnabled } from "./mcp-apps-enabled.js";

export interface IListViewUiDecisionInput {
  id?: string;
  status?: string;
  assignee?: string;
  /** Force (true) or suppress (false) the interactive list widget. */
  ui?: boolean;
}

/**
 * Whether a list tool result should include `_meta.ui`.
 *
 * - `get_*` tools pass `{ mode: "text" }` so they never open the App.
 * - `present_*` tools pass `{ mode: "app" }` so hosts that key off tool
 *   `_meta.ui` only render when the model deliberately chose the present tools.
 */
export function shouldAttachListUi(
  input: IListViewUiDecisionInput & { mode?: "text" | "app" },
  data: SpydrListViewResult
): boolean {
  if (!mcpAppsEnabled()) return false;
  if (data.items.length === 0) return false;
  if (input.mode === "text") return false;
  if (input.ui === false) return false;
  if (input.mode === "app") return true;
  if (input.ui === true) return true;
  if (input.id) return true;
  if (input.status || input.assignee) return true;
  return false;
}
