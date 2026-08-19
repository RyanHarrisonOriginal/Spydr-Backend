import { projectResolutionResultSchema } from "../zod-schema.js";
import {
  ActiveNoteAnalysisError,
  type ProjectFitEvaluation,
  type ProjectResolutionResult,
} from "../../../../../domain/active-notes/index.js";

export function parseProjectResolverOutput(
  raw: unknown,
  qualifiedCandidates: ProjectFitEvaluation[]
): ProjectResolutionResult {
  const parsedResult = projectResolutionResultSchema.safeParse(raw);

  if (!parsedResult.success) {
    throw new ActiveNoteAnalysisError(
      "AI provider returned an invalid project resolver response"
    );
  }

  const parsed = parsedResult.data;
  const matchedCandidate = qualifiedCandidates.find(
    (candidate) => candidate.projectId === parsed.projectId
  );

  if (!matchedCandidate) {
    throw new ActiveNoteAnalysisError(
      "AI provider returned an unknown projectId during project resolution"
    );
  }

  if (parsed.projectName !== matchedCandidate.projectName) {
    throw new ActiveNoteAnalysisError(
      "AI provider returned a mismatched projectName during project resolution"
    );
  }

  if (parsed.matchBasis !== matchedCandidate.matchBasis) {
    throw new ActiveNoteAnalysisError(
      "AI provider returned a mismatched matchBasis during project resolution"
    );
  }

  return parsed;
}
