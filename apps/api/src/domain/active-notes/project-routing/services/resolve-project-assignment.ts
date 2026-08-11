import type {
  ActiveNoteProjectAssignment,
  ProjectFitEvaluation,
  ProjectResolutionResult,
  SegmentWithProjectMatches,
} from "../types/index.js";
import { isProjectFitMatch } from "../helpers/parse-project-fit-output.js";

export type ProjectAssignmentResolution =
  | { kind: "existing_project"; evaluation: ProjectFitEvaluation }
  | { kind: "multiple_matches"; evaluations: ProjectFitEvaluation[] }
  | { kind: "no_matches" };

export function resolveProjectAssignmentFromFitEvaluations(
  evaluations: ProjectFitEvaluation[]
): ProjectAssignmentResolution {
  const matches = evaluations.filter((evaluation) =>
    isProjectFitMatch(evaluation)
  );

  if (matches.length === 0) {
    return { kind: "no_matches" };
  }

  if (matches.length === 1) {
    return { kind: "existing_project", evaluation: matches[0]! };
  }

  return { kind: "multiple_matches", evaluations: matches };
}

export function projectFitEvaluationToAssignment(
  segment: SegmentWithProjectMatches,
  evaluation: ProjectFitEvaluation
): ActiveNoteProjectAssignment {
  return projectResolutionToAssignment(segment, {
    projectId: evaluation.projectId,
    projectName: evaluation.projectName,
    matchBasis: evaluation.matchBasis,
    confidence: evaluation.confidence,
    reason: evaluation.reason,
  });
}

export function projectResolutionToAssignment(
  segment: SegmentWithProjectMatches,
  resolution: ProjectResolutionResult
): ActiveNoteProjectAssignment {
  return {
    originalText: segment.sourceText,
    destination: "existing_project",
    projectId: resolution.projectId,
    projectName: resolution.projectName,
    matchBasis: resolution.matchBasis,
    confidence: resolution.confidence,
    reason: resolution.reason,
  };
}

export function unassignedProjectAssignment(
  segment: SegmentWithProjectMatches,
  reason: string,
  confidence = 0.3
): ActiveNoteProjectAssignment {
  return {
    originalText: segment.sourceText,
    destination: "unassigned",
    projectId: null,
    projectName: null,
    matchBasis: "none",
    confidence,
    reason,
  };
}
