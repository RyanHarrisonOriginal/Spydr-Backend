import type { EmbeddedSegment, SegmentWithProjectMatches } from "../../pipeline/types/index.js";
import {
  DEFAULT_PROJECT_SEARCH_LIMIT,
  type ProjectRetrievalService,
} from "../services/project-retrieval.service.js";

export async function searchSegmentProjectMatches(
  segments: EmbeddedSegment[],
  projectRetrievalService: ProjectRetrievalService,
  limit = DEFAULT_PROJECT_SEARCH_LIMIT
): Promise<SegmentWithProjectMatches[]> {
  const projectMatchesByIndex = await Promise.all(
    segments.map((segment) =>
      projectRetrievalService.search(segment.embedding, limit)
    )
  );

  return segments.map((segment, index) => ({
    ...segment,
    projectMatches: projectMatchesByIndex[index] ?? [],
  }));
}
