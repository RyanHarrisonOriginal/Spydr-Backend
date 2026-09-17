function tokenPattern(): RegExp {
  return /\{\{([A-Z][A-Z0-9_]*)\}\}/g;
}

/** Stored when a spawned project has no value yet for a newly introduced parameter. */
export const UNSPECIFIED_PARAM_VALUE = "UNSPECIFIED";

/** Extract unique `{{KEY}}` tokens from one or more strings. */
export function extractTemplateKeys(...texts: Array<string | null | undefined>): string[] {
  const keys = new Set<string>();
  const tokenRe = tokenPattern();
  for (const text of texts) {
    if (!text) continue;
    tokenRe.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = tokenRe.exec(text)) !== null) {
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
  return text.replace(tokenPattern(), (_full, key: string) => {
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

/** Defined parameter keys plus any `{{KEY}}` tokens used in template text. */
export function collectTemplateParamKeys(template: {
  titleTemplate: string;
  bodyTemplate: string;
  outcomeTemplate?: string | null;
  tags?: string[];
  parameters: Array<{ key: string }>;
  tasks: Array<{
    titleTemplate: string;
    bodyTemplate: string;
    tags?: string[];
  }>;
}): string[] {
  const used = extractTemplateKeys(
    template.titleTemplate,
    template.bodyTemplate,
    template.outcomeTemplate,
    ...(template.tags ?? []),
    ...(template.tasks ?? []).flatMap((task) => [
      task.titleTemplate,
      task.bodyTemplate,
      ...(task.tags ?? []),
    ])
  );
  return Array.from(
    new Set([...(template.parameters ?? []).map((param) => param.key), ...used])
  );
}

/**
 * Values to merge onto a spawned project for keys it does not already store.
 * Empty provided values fall back to UNSPECIFIED so sync can interpolate.
 */
export function fillMissingParamValues(
  existing: Record<string, string>,
  keys: string[],
  provided: Record<string, string> = {}
): Record<string, string> {
  const additions: Record<string, string> = {};
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(existing, key)) continue;
    const raw = provided[key];
    additions[key] =
      raw !== undefined && raw.trim().length > 0
        ? raw.trim()
        : UNSPECIFIED_PARAM_VALUE;
  }
  return additions;
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
