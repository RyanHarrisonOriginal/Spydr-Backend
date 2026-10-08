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

function countBy(items: SpydrListViewItem[], key: "status" | "assignee"): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value =
      key === "status" ? item.status || "unknown" : item.assignee?.trim() || "unassigned";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([label, count]) => `${label}=${count}`)
    .join(", ");
}

/**
 * Concise text fallback for hosts that do not render MCP Apps UI.
 * Prefer rollups + a short preview so models are not stuck on the first page.
 */
export function summarizeListView(result: SpydrListViewResult): string {
  const { kind, items } = result;
  const noun = kind === "projects" ? "project" : "task";
  const totalMatched = result.totalMatched ?? items.length;

  if (totalMatched === 0) {
    return `No ${noun}s found.`;
  }

  const lines: string[] = [];
  const returned = items.length;
  if (returned < totalMatched) {
    const offset = result.offset ?? 0;
    lines.push(
      `Showing ${returned} of ${totalMatched} ${noun}s (offset ${offset}${result.limit != null ? `, limit ${result.limit}` : ""}).`
    );
    lines.push(
      `Pass status/assignee filters or raise limit/offset on get_${kind} to page further. Do not assume only the preview below exists.`
    );
  } else {
    lines.push(`${totalMatched} ${totalMatched === 1 ? noun : `${noun}s`}:`);
  }

  const scope = returned < totalMatched ? "this page" : "all matched";
  lines.push(`By status (${scope}): ${countBy(items, "status")}`);
  if (kind === "tasks") {
    lines.push(`By assignee (${scope}): ${countBy(items, "assignee")}`);
  }

  const previewLimit = Math.min(items.length, 12);
  for (const item of items.slice(0, previewLimit)) {
    lines.push(formatItemLine(item, kind));
  }
  if (items.length > previewLimit) {
    lines.push(`…and ${items.length - previewLimit} more in this page.`);
  }

  return lines.join("\n");
}
