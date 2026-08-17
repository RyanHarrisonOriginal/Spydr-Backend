const EMBEDDING_KEY = "embedding";

export function stripPipelinePayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripPipelinePayload);
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== EMBEDDING_KEY)
      .map(([key, nested]) => [key, stripPipelinePayload(nested)]);
    return Object.fromEntries(entries);
  }

  return value;
}
