import { toProjectAssignmentCandidate } from "./build-project-candidate.js";
import type { IProjectAssignmentPort } from "./ports/project-assignment.port.js";
import type {
  ActiveNoteProjectAssignment,
  SegmentWithProjectMatches,
} from "./types/index.js";
import {
  projectFitEvaluationToAssignment,
  projectResolutionToAssignment,
  resolveProjectAssignmentFromFitEvaluations,
} from "./resolve-project-assignment.js";

export async function inferSegmentProjectAssignmentFromFitEvaluations(
  segment: SegmentWithProjectMatches,
  assignment: IProjectAssignmentPort
): Promise<ActiveNoteProjectAssignment> {
  const candidates = segment.projectMatches.map(toProjectAssignmentCandidate);

  if (candidates.length === 0) {
    return assignment.classifyUnassigned(segment);
  }

  const evaluations = await Promise.all(
    candidates.map((candidate) => assignment.evaluateFit(segment, candidate))
  );

  const resolution = resolveProjectAssignmentFromFitEvaluations(evaluations);

  if (resolution.kind === "existing_project") {
    return projectFitEvaluationToAssignment(segment, resolution.evaluation);
  }

  if (resolution.kind === "multiple_matches") {
    const projectResolution = await assignment.resolveMatch(
      segment,
      resolution.evaluations
    );
    return projectResolutionToAssignment(segment, projectResolution);
  }

  return assignment.classifyUnassigned(segment);
}

export async function inferSegmentProjectAssignmentsFromFitEvaluations(
  segments: SegmentWithProjectMatches[],
  assignment: IProjectAssignmentPort
): Promise<
  Array<SegmentWithProjectMatches & { projectAssignment: ActiveNoteProjectAssignment }>
> {
  return Promise.all(
    segments.map(async (segment) => ({
      ...segment,
      projectAssignment: await inferSegmentProjectAssignmentFromFitEvaluations(
        segment,
        assignment
      ),
    }))
  );
}
