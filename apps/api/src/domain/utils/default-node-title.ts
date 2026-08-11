export function defaultUntitledNodeTitle(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `Untitled Node - ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function resolveNoteTitle(title: string | null | undefined, now = new Date()): string {
  const trimmed = title?.trim();
  return trimmed ? trimmed : defaultUntitledNodeTitle(now);
}
