import type { SegmentWithProjectMatches } from "../../../domain/index.js";

export function buildProjectDestinationUserInput(
  segment: SegmentWithProjectMatches
): string {
  return JSON.stringify({
    topic: segment.topic,
    sourceText: segment.sourceText,
    contextualText: segment.contextualText,
  });
}
