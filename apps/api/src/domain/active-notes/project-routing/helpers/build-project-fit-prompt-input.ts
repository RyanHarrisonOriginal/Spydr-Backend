import type {
  ProjectAssignmentCandidate,
  ProjectFitInput,
  SegmentWithProjectMatches,
} from "../types/index.js";

export function buildProjectFitInput(
  segment: SegmentWithProjectMatches,
  candidate: ProjectAssignmentCandidate
): ProjectFitInput {
  return {
    topic: segment.topic,
    sourceText: segment.sourceText,
    contextualText: segment.contextualText,
    candidate,
  };
}

export function buildProjectFitUserInput(
  segment: SegmentWithProjectMatches,
  candidate: ProjectAssignmentCandidate
): string {
  return JSON.stringify(buildProjectFitInput(segment, candidate));
}

export function buildProjectDestinationUserInput(
  segment: SegmentWithProjectMatches
): string {
  return JSON.stringify({
    topic: segment.topic,
    sourceText: segment.sourceText,
    contextualText: segment.contextualText,
  });
}
