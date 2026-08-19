import type {
  UnassignedActionPlan,
  UnassignedRoutedSegment,
} from "./types/index.js";

export function buildUnassignedActionPlan(
  assignment: UnassignedRoutedSegment
): UnassignedActionPlan {
  return {
    destination: "unassigned",
    originalText: assignment.originalText,
    projectId: null,
    projectName: null,
    confidence: assignment.confidence,
    reason: assignment.reason,
  };
}
