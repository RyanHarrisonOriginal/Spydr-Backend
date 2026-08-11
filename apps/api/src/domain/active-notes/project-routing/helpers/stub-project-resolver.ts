import type {
  ProjectFitEvaluation,
  ProjectMatchBasis,
  ProjectResolutionResult,
} from "../types/index.js";

const MATCH_BASIS_SPECIFICITY: Record<ProjectMatchBasis, number> = {
  existing_task: 0,
  direct_project_reference: 1,
  existing_decision: 2,
  existing_idea: 3,
  existing_context: 4,
  project_scope: 5,
  none: 99,
};

export async function inferStubProjectMatchResolution(
  qualifiedCandidates: ProjectFitEvaluation[]
): Promise<ProjectResolutionResult> {
  const [winner] = [...qualifiedCandidates].sort((left, right) => {
    const basisDelta =
      MATCH_BASIS_SPECIFICITY[left.matchBasis] -
      MATCH_BASIS_SPECIFICITY[right.matchBasis];
    if (basisDelta !== 0) {
      return basisDelta;
    }

    return left.projectName.localeCompare(right.projectName);
  });

  if (!winner) {
    throw new Error("Cannot resolve project match without qualified candidates");
  }

  return {
    projectId: winner.projectId,
    projectName: winner.projectName,
    matchBasis: winner.matchBasis,
    confidence: winner.confidence,
    reason: winner.reason,
  };
}
