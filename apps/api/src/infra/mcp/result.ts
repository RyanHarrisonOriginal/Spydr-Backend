import type { SpydrListViewResult } from "./app/list-view-contract.js";
import { summarizeListView } from "./app/summarize-list-view.js";

export interface IMcpToolResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export function jsonResult(data: unknown): IMcpToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

export function listViewResult(data: SpydrListViewResult): IMcpToolResult {
  return {
    content: [{ type: "text", text: summarizeListView(data) }],
    structuredContent: data as unknown as Record<string, unknown>,
  };
}

export function errorResult(message: string): IMcpToolResult {
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

export async function runTool(
  fn: () => Promise<unknown>
): Promise<IMcpToolResult> {
  try {
    const data = await fn();
    if (data === null) {
      return errorResult("Not found");
    }
    return jsonResult(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return errorResult(message);
  }
}

export async function runListViewTool(
  fn: () => Promise<SpydrListViewResult | null>
): Promise<IMcpToolResult> {
  try {
    const data = await fn();
    if (data === null) {
      return errorResult("Not found");
    }
    return listViewResult(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return errorResult(message);
  }
}
