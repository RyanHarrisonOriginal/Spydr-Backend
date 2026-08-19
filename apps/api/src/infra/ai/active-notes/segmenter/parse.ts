import { activeNoteSegmentationOutputSchema } from "./zod-schema.js";
import type { ActiveNoteSegmentationResult } from "../../../../domain/active-notes/index.js";

export function parseActiveNoteSegmentationOutput(
  raw: unknown
): ActiveNoteSegmentationResult {
  return activeNoteSegmentationOutputSchema.parse(
    raw
  ) as ActiveNoteSegmentationResult;
}
