import type { SpydrListViewItem, SpydrListViewResult } from "./list-view-contract.js";

function formatItemLine(item: SpydrListViewItem, kind: SpydrListViewResult["kind"]): string {
  const emoji = item.emoji ? `${item.emoji} ` : "";
  const parts = [`${emoji}${item.name}`, item.status, item.priority];
  if (item.assignee) parts.push(`assignee ${item.assignee}`);
  if (kind === "projects" && item.target) parts.push(`target ${item.target}`);
  if (kind === "tasks") {
    if (item.project) parts.push(`project ${item.project.name}`);
    if (item.dueDate) parts.push(`due ${item.dueDate}`);
  }
  return `- ${parts.join(" · ")}`;
}

/**
 * Concise text fallback for hosts that do not render MCP Apps UI.
 * Useful on its own; does not dump full JSON.
 */
export function summarizeListView(result: SpydrListViewResult): string {
  const { kind, items } = result;
  const noun = kind === "projects" ? "project" : "task";
  if (items.length === 0) {
    return `No ${noun}s found.`;
  }

  const label = items.length === 1 ? noun : `${noun}s`;
  const header = `${items.length} ${label}:`;
  const preview = items.slice(0, 20).map((item) => formatItemLine(item, kind));
  const more =
    items.length > 20 ? [`…and ${items.length - 20} more.`] : [];

  return [header, ...preview, ...more].join("\n");
}
