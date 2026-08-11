export interface IProjectAreaDetailsProps {
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_PROJECT_AREA_COLOR = "18 94% 50%";

const PROJECT_AREA_COLOR_PATTERN = /^\d{1,3} \d{1,3}% \d{1,3}%$/;

export function normalizeProjectAreaColor(
  color: string | undefined,
  fallback = DEFAULT_PROJECT_AREA_COLOR
): string {
  const trimmed = color?.trim();
  if (!trimmed) return fallback;
  if (!PROJECT_AREA_COLOR_PATTERN.test(trimmed)) {
    throw new Error("Invalid project area color");
  }
  return trimmed;
}
