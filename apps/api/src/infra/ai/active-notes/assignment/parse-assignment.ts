import { activeNoteProjectAssignmentSchema } from "./zod-schema.js";
import { extractProjectNameFromRetrievalDocument } from "../../../../domain/active-notes/index.js";
import {
  ActiveNoteAnalysisError,
  type ActiveNoteProjectAssignment,
  type SegmentWithProjectMatches,
} from "../../../../domain/active-notes/index.js";

export function parseActiveNoteProjectAssignmentOutput(
  raw: unknown,
  segment: SegmentWithProjectMatches
): ActiveNoteProjectAssignment {
  const parsed = activeNoteProjectAssignmentSchema.parse(
    raw
  ) as ActiveNoteProjectAssignment;

  if (parsed.originalText !== segment.sourceText) {
    throw new ActiveNoteAnalysisError(
      "AI provider returned mismatched originalText"
    );
  }

  if (parsed.destination !== "existing_project") {
    return parsed;
  }

  const candidate = segment.projectMatches.find(
    (match) => match.projectId === parsed.projectId
  );
  if (!candidate) {
    throw new ActiveNoteAnalysisError(
      "AI provider returned an unknown projectId"
    );
  }

  const expectedProjectName = extractProjectNameFromRetrievalDocument(
    candidate.retrievalDocument
  );
  if (
    expectedProjectName &&
    parsed.projectName !== expectedProjectName
  ) {
    throw new ActiveNoteAnalysisError(
      "AI provider returned a mismatched projectName"
    );
  }

  return parsed;
}
