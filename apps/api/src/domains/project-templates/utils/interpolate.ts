const TOKEN_RE = /\{\{([A-Z][A-Z0-9_]*)\}\}/g;

/** Extract unique `{{KEY}}` tokens from one or more strings. */
export function extractTemplateKeys(...texts: Array<string | null | undefined>): string[] {
  const keys = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    TOKEN_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TOKEN_RE.exec(text)) !== null) {
      keys.add(match[1]);
    }
  }
  return Array.from(keys);
}

/** Replace `{{KEY}}` tokens; unknown keys left intact for fail-closed checks. */
export function renderTemplate(
  text: string,
  params: Record<string, string>
): string {
  return text.replace(TOKEN_RE, (_full, key: string) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return params[key];
    }
    return `{{${key}}}`;
  });
}

export function assertFullyRendered(label: string, text: string): void {
  const leftover = extractTemplateKeys(text);
  if (leftover.length > 0) {
    throw new Error(
      `Unresolved template tokens in ${label}: ${leftover.join(", ")}`
    );
  }
}

export function validateParamValues(
  definedKeys: Array<{ key: string; required: boolean; defaultValue: string | null }>,
  values: Record<string, string>
): Record<string, string> {
  const resolved: Record<string, string> = {};
  const defined = new Set(definedKeys.map((p) => p.key));

  for (const param of definedKeys) {
    const raw = values[param.key];
    const value =
      raw !== undefined && raw.trim().length > 0
        ? raw.trim()
        : param.defaultValue?.trim() || "";
    if (param.required && !value) {
      throw new Error(`Missing required parameter: ${param.key}`);
    }
    resolved[param.key] = value;
  }

  for (const key of Object.keys(values)) {
    if (!defined.has(key)) {
      throw new Error(`Unknown template parameter: ${key}`);
    }
  }

  return resolved;
}
