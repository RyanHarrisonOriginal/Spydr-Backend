import type {
  ActiveNoteProjectAssignment,
  ProjectAssignmentCandidate,
  ProjectFitEvaluation,
  ProjectResolutionResult,
  SegmentWithProjectMatches,
} from "../types/index.js";

export interface IProjectAssignmentPort {
  evaluateFit(
    segment: SegmentWithProjectMatches,
    candidate: ProjectAssignmentCandidate
  ): Promise<ProjectFitEvaluation>;
  resolveMatch(
    segment: SegmentWithProjectMatches,
    qualifiedEvaluations: ProjectFitEvaluation[]
  ): Promise<ProjectResolutionResult>;
  classifyUnassigned(
    segment: SegmentWithProjectMatches
  ): Promise<ActiveNoteProjectAssignment>;
}
