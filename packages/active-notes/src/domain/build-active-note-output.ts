import { ActiveNoteAnalysisError } from "./types/errors.js";
import type {
  ActiveNoteActionPlanResult,
  ActiveNoteAIOutput,
} from "./types/index.js";
import { assertSegmentContextualTextMatches } from "./attach-segment-lineage-to-action-plan.js";

export function buildActiveNoteOutput(
  result: ActiveNoteActionPlanResult
): ActiveNoteAIOutput {
  return {
    segments: result.embeddedSegments.map(
      ({ topic, sourceText, contextualText }) => ({
        topic,
        sourceText,
        contextualText,
      })
    ),
    actionPlans: result.embeddedSegments.flatMap((segment) => {
      if (!segment.actionPlan) {
        throw new ActiveNoteAnalysisError(
          `Missing action plan for segment: ${segment.sourceText}`
        );
      }

      assertSegmentContextualTextMatches(segment, segment.actionPlan);

      return [
        {
          ...segment.actionPlan,
          topic: segment.topic,
          contextualText: segment.contextualText,
        },
      ];
    }),
  };
}
