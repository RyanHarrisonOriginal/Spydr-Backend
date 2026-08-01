/**
 * OpenAI strict JSON schemas require nullable fields to be present as null.
 * Strip those nulls so domain Zod schemas can treat fields as optional.
 */
function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripNulls);
  }
  if (!value || typeof value !== "object") {
    return value;
  }

  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (entry === null || entry === undefined) continue;
    result[key] = stripNulls(entry);
  }
  return result;
}

export function stripNullPayloadFields(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  return stripNulls(raw);
}
