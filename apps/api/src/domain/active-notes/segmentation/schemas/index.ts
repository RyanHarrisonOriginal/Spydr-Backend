import { z } from "zod";

export const activeNoteSegmentSchema = z.object({
  topic: z.string().trim().min(1),
  sourceText: z.string().min(1),
  contextualText: z.string().trim().min(1),
});

export const activeNoteSegmentationOutputSchema = z.object({
  segments: z.array(activeNoteSegmentSchema).min(1),
});
