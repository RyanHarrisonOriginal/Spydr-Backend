import { inferStubProjectFitEvaluation } from "./fit/stub.js";
import { inferStubProjectMatchResolution } from "./resolver/stub.js";
import {
  inferSegmentProjectAssignmentsFromFitEvaluations,
  unassignedProjectAssignment,
  type IProjectAssignmentPort,
  type ActiveNoteProjectAssignment,
  type SegmentWithProjectMatches,
} from "../../domain/index.js";

export const stubProjectAssignmentPort: IProjectAssignmentPort = {
  evaluateFit: inferStubProjectFitEvaluation,
  resolveMatch: async (_segment, qualifiedEvaluations) =>
    inferStubProjectMatchResolution(qualifiedEvaluations),
  classifyUnassigned: async (segment) =>
    unassignedProjectAssignment(
      segment,
      "Stub provider found no qualifying existing Project."
    ),
};

export async function inferStubProjectAssignments(
  segments: SegmentWithProjectMatches[]
): Promise<
  Array<SegmentWithProjectMatches & { projectAssignment: ActiveNoteProjectAssignment }>
> {
  return inferSegmentProjectAssignmentsFromFitEvaluations(
    segments,
    stubProjectAssignmentPort
  );
}
