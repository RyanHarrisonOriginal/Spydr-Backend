import { projectDestinationSchema } from "../schemas/index.js";
import { parseActiveNoteProjectAssignmentOutput } from "./parse-project-assignment-output.js";
import type {
  ActiveNoteProjectAssignment,
  SegmentWithProjectMatches,
} from "../types/index.js";

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
