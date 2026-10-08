/**
 * Phase-2 interaction seam.
 *
 * All write actions go through existing MCP server tools via the host proxy.
 * The iframe never holds credentials.
 */
import type { App } from "@modelcontextprotocol/ext-apps";
import type { SpydrListViewItem } from "@contract";

export const INTERACTIONS_ENABLED = true;

const TASK_STATUSES = ["active", "waiting", "blocked", "completed"] as const;

export type TaskStatusOption = (typeof TASK_STATUSES)[number];

export function isTaskStatus(value: string): value is TaskStatusOption {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function taskStatusOptions(): readonly TaskStatusOption[] {
  return TASK_STATUSES;
}

export async function markTaskComplete(
  app: App,
  taskId: string
): Promise<void> {
  const result = await app.callServerTool({
    name: "mark_task_complete",
    arguments: { taskId },
  });
  if (result.isError) {
    throw new Error(textFromToolResult(result) || "Failed to complete task");
  }
}

export async function modifyTaskStatus(
  app: App,
  taskId: string,
  status: TaskStatusOption
): Promise<void> {
  const result = await app.callServerTool({
    name: "modify_task_status",
    arguments: { taskId, status },
  });
  if (result.isError) {
    throw new Error(textFromToolResult(result) || "Failed to update status");
  }
}

/** Ask the host to post a follow-up user message into the conversation. */
export async function sendFollowUp(
  app: App,
  item: SpydrListViewItem,
  kind: "projects" | "tasks"
): Promise<void> {
  const text =
    kind === "projects"
      ? `Show tasks for project ${item.name}`
      : `Show details for task ${item.name}`;

  await app.sendMessage({
    role: "user",
    content: [{ type: "text", text }],
  });
}

function textFromToolResult(result: {
  content?: Array<{ type: string; text?: string }>;
}): string {
  const block = result.content?.find((entry) => entry.type === "text");
  return block?.text ?? "";
}
