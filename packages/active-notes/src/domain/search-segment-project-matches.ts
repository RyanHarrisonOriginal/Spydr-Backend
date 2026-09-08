import type {
  EmbeddedSegment,
  SegmentWithProjectMatches,
} from "./types/index.js";
import type { IProjectSearchPort } from "./ports/project-search.port.js";
import {
  DEFAULT_PROJECT_SEARCH_LIMIT,
  searchProjects,
} from "./search-projects.js";

export async function searchSegmentProjectMatches(
  segments: EmbeddedSegment[],
  projectSearch: IProjectSearchPort,
  orgId: string,
  limit = DEFAULT_PROJECT_SEARCH_LIMIT
): Promise<SegmentWithProjectMatches[]> {
  const projectMatchesByIndex = await Promise.all(
    segments.map((segment) =>
      searchProjects(projectSearch, orgId, segment.embedding, limit)
    )
  );

  return segments.map((segment, index) => ({
    ...segment,
    projectMatches: projectMatchesByIndex[index] ?? [],
  }));
}
