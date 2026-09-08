import type {
  NewProjectCandidateActionPlan,
  NewProjectCandidateRoutedSegment,
} from "./types/index.js";

export function buildNewProjectCandidateActionPlan(
  assignment: NewProjectCandidateRoutedSegment
): NewProjectCandidateActionPlan {
  return {
    destination: "new_project_candidate",
    originalText: assignment.originalText,
    projectId: null,
    projectName: assignment.projectName,
    confidence: assignment.confidence,
    reason: assignment.reason,
  };
}
