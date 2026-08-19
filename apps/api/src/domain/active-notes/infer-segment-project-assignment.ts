import { toProjectAssignmentCandidate } from "../helpers/build-project-candidate-input.js";
import type {
  ActiveNoteProjectAssignment,
  ProjectAssignmentCandidate,
  ProjectFitEvaluation,
  ProjectResolutionResult,
  SegmentWithProjectMatches,
} from "../types/index.js";
import {
  projectFitEvaluationToAssignment,
  projectResolutionToAssignment,
  resolveProjectAssignmentFromFitEvaluations,
  unassignedProjectAssignment,
} from "./resolve-project-assignment.js";

export type EvaluateProjectFitFn = (
  segment: SegmentWithProjectMatches,
  candidate: ProjectAssignmentCandidate
) => Promise<ProjectFitEvaluation>;

export type ResolveProjectMatchFn = (
  segment: SegmentWithProjectMatches,
  qualifiedEvaluations: ProjectFitEvaluation[]
) => Promise<ProjectResolutionResult>;

export type ClassifyUnassignedDestinationFn = (
  segment: SegmentWithProjectMatches
) => Promise<ActiveNoteProjectAssignment>;

export async function inferSegmentProjectAssignmentFromFitEvaluations(
  segment: SegmentWithProjectMatches,
  deps: {
    evaluateProjectFit: EvaluateProjectFitFn;
    resolveProjectMatch: ResolveProjectMatchFn;
    classifyUnassignedDestination: ClassifyUnassignedDestinationFn;
  }
): Promise<ActiveNoteProjectAssignment> {
  const candidates = segment.projectMatches.map(toProjectAssignmentCandidate);

  if (candidates.length === 0) {
    return deps.classifyUnassignedDestination(segment);
  }

  const evaluations = await Promise.all(
    candidates.map((candidate) => deps.evaluateProjectFit(segment, candidate))
  );

  const resolution = resolveProjectAssignmentFromFitEvaluations(evaluations);

  if (resolution.kind === "existing_project") {
    return projectFitEvaluationToAssignment(segment, resolution.evaluation);
  }

  if (resolution.kind === "multiple_matches") {
    const projectResolution = await deps.resolveProjectMatch(
      segment,
      resolution.evaluations
    );
    return projectResolutionToAssignment(segment, projectResolution);
  }

  return deps.classifyUnassignedDestination(segment);
}

export async function inferSegmentProjectAssignmentsFromFitEvaluations(
  segments: SegmentWithProjectMatches[],
  deps: {
    evaluateProjectFit: EvaluateProjectFitFn;
    resolveProjectMatch: ResolveProjectMatchFn;
    classifyUnassignedDestination: ClassifyUnassignedDestinationFn;
  }
): Promise<
  Array<SegmentWithProjectMatches & { projectAssignment: ActiveNoteProjectAssignment }>
> {
  return Promise.all(
    segments.map(async (segment) => ({
      ...segment,
      projectAssignment: await inferSegmentProjectAssignmentFromFitEvaluations(
        segment,
        deps
      ),
    }))
  );
}

export { unassignedProjectAssignment };
