import {
  ActiveNoteAnalysisError,
  type ActiveNoteSegment,
  type SegmentActionPlan,
} from "./types/index.js";

export function attachSegmentLineageToActionPlan(
  segment: Pick<ActiveNoteSegment, "sourceText" | "contextualText" | "topic">,
  actionPlan: SegmentActionPlan
): SegmentActionPlan {
  if (actionPlan.originalText !== segment.sourceText) {
    throw new ActiveNoteAnalysisError(
      "Action plan originalText does not match segment sourceText"
    );
  }

  return {
    ...actionPlan,
    topic: segment.topic,
    contextualText: segment.contextualText,
  };
}

export function assertSegmentContextualTextMatches(
  segment: Pick<ActiveNoteSegment, "contextualText" | "topic">,
  actionPlan: Pick<SegmentActionPlan, "contextualText" | "topic">
): void {
  if (
    actionPlan.contextualText != null &&
    actionPlan.contextualText !== segment.contextualText
  ) {
    throw new ActiveNoteAnalysisError(
      "Action plan contextualText does not match segment contextualText"
    );
  }

  if (actionPlan.topic != null && actionPlan.topic !== segment.topic) {
    throw new ActiveNoteAnalysisError(
      "Action plan topic does not match segment topic"
    );
  }
}
