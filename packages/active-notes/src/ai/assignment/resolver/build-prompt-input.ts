import type {
  ProjectFitEvaluation,
  ProjectResolverInput,
  SegmentWithProjectMatches,
} from "../../../domain/index.js";
import { isProjectFitMatch } from "../fit/parse.js";

export function toProjectResolverCandidate(
  evaluation: ProjectFitEvaluation
): ProjectResolverInput["candidates"][number] | null {
  if (!isProjectFitMatch(evaluation)) {
    return null;
  }

  if (!evaluation.segmentEvidence || !evaluation.projectEvidence) {
    return null;
  }

  return {
    projectId: evaluation.projectId,
    projectName: evaluation.projectName,
    matchBasis: evaluation.matchBasis,
    segmentEvidence: evaluation.segmentEvidence,
    projectEvidence: evaluation.projectEvidence,
    targetObjectId: evaluation.targetObjectId ?? null,
    targetObjectTitle: evaluation.targetObjectTitle ?? null,
    reason: evaluation.reason,
  };
}

export function buildProjectResolverInput(
  segment: SegmentWithProjectMatches,
  qualifiedEvaluations: ProjectFitEvaluation[]
): ProjectResolverInput {
  return {
    topic: segment.topic,
    sourceText: segment.sourceText,
    contextualText: segment.contextualText,
    candidates: qualifiedEvaluations
      .map(toProjectResolverCandidate)
      .filter(
        (candidate): candidate is ProjectResolverInput["candidates"][number] =>
          candidate !== null
      ),
  };
}

export function buildProjectResolverUserInput(
  segment: SegmentWithProjectMatches,
  qualifiedEvaluations: ProjectFitEvaluation[]
): string {
  return JSON.stringify(
    buildProjectResolverInput(segment, qualifiedEvaluations)
  );
}
