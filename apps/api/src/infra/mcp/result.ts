export interface IMcpToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function jsonResult(data: unknown): IMcpToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
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
