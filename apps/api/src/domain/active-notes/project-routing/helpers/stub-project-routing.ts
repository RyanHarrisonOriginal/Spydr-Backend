import { inferStubProjectFitEvaluation } from "./stub-project-fit-evaluation.js";
import { inferStubProjectMatchResolution } from "./stub-project-resolver.js";
import {
  inferSegmentProjectAssignmentsFromFitEvaluations,
  unassignedProjectAssignment,
} from "../services/infer-segment-project-assignment.js";
import { projectResolutionToAssignment } from "../services/resolve-project-assignment.js";
import type {
  ActiveNoteProjectAssignment,
  SegmentWithProjectMatches,
} from "../types/index.js";

export async function inferStubProjectAssignments(
  segments: SegmentWithProjectMatches[]
): Promise<
  Array<SegmentWithProjectMatches & { projectAssignment: ActiveNoteProjectAssignment }>
> {
  return inferSegmentProjectAssignmentsFromFitEvaluations(segments, {
    evaluateProjectFit: inferStubProjectFitEvaluation,
    resolveProjectMatch: async (_segment, qualifiedEvaluations) =>
      inferStubProjectMatchResolution(qualifiedEvaluations),
    classifyUnassignedDestination: async (segment) =>
      unassignedProjectAssignment(
        segment,
        "Stub provider found no qualifying existing Project."
      ),
  });
}

export { projectResolutionToAssignment };
