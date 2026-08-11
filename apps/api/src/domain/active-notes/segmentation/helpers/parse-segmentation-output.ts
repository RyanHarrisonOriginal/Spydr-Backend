import { activeNoteSegmentationOutputSchema } from "../schemas/index.js";
import type { ActiveNoteSegmentationResult } from "../types/index.js";

export function parseActiveNoteSegmentationOutput(
  raw: unknown
): ActiveNoteSegmentationResult {
  return activeNoteSegmentationOutputSchema.parse(
    raw
  ) as ActiveNoteSegmentationResult;
}
