/** @deprecated Legacy auto-titles; kept for detecting historical rows in UIs. */
export function defaultUntitledNodeTitle(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `Untitled Node - ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/**
 * Notes may omit a title. Persists as empty string (SpydrNode.title is non-null).
 * Do not synthesize "Untitled Node - …" placeholders.
 */
export function resolveNoteTitle(title: string | null | undefined): string {
  return title?.trim() ?? "";
}
