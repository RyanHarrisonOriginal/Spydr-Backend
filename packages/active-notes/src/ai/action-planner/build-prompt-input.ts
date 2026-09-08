import type { PlanSegmentActionInput } from "../../domain/index.js";

export function buildSegmentActionPlannerUserInput(
  input: PlanSegmentActionInput
): string {
  return JSON.stringify({
    segment: {
      originalText: input.routedSegment.originalText,
      contextualText: input.contextualText,
      topic: input.topic,
      projectId: input.routedSegment.projectId,
      projectName: input.routedSegment.projectName,
    },
    projectContext: input.projectContext,
  });
}
