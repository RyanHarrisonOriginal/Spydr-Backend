import { projectDestinationSchema } from "../zod-schema.js";
import { parseActiveNoteProjectAssignmentOutput } from "../parse-assignment.js";
import type {
  ActiveNoteProjectAssignment,
  SegmentWithProjectMatches,
} from "../../../../../domain/active-notes/index.js";

export function parseProjectDestinationOutput(
  raw: unknown,
  segment: SegmentWithProjectMatches
): ActiveNoteProjectAssignment {
  const parsed = projectDestinationSchema.parse(raw);

  return parseActiveNoteProjectAssignmentOutput(
    {
      ...parsed,
      projectId: null,
    },
    segment
  );
}
