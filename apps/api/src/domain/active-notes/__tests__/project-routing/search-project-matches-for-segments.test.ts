import { PROJECT_EMBEDDING_VECTOR_DIMENSIONS } from "@spydr/ai";
import { describe, expect, it, vi } from "vitest";
import { ProjectRetrievalService } from "../../project-routing/services/project-retrieval.service.js";
import { searchSegmentProjectMatches } from "../../project-routing/helpers/search-project-matches-for-segments.js";
import type { EmbeddedSegment } from "../../pipeline/types/index.js";

const ORG_ID = "org-11111111-1111-1111-1111-111111111111";

function createSegment(label: string): EmbeddedSegment {
  return {
    topic: label,
    sourceText: label,
    contextualText: label,
    embedding: Array.from(
      { length: PROJECT_EMBEDDING_VECTOR_DIMENSIONS },
      (_, index) => index / PROJECT_EMBEDDING_VECTOR_DIMENSIONS
    ),
  };
}

describe("searchSegmentProjectMatches", () => {
  it("searches multiple segments concurrently while preserving segment order", async () => {
    const callOrder: string[] = [];
    const searchProjectsByEmbedding = vi
      .fn()
      .mockImplementation(async (input: { orgId: string; limit: number }) => {
        callOrder.push(`${input.orgId}:${input.limit}`);
        return [
          {
            projectId: `project-for-${callOrder.length}`,
            similarity: 0.75,
            retrievalDocument: "PROJECT: Match",
          },
        ];
      });

    const service = new ProjectRetrievalService({
      orgId: ORG_ID,
      searchProjectsByEmbedding,
    });
    const searchSpy = vi.spyOn(service, "search");

    const segments = [createSegment("first"), createSegment("second"), createSegment("third")];
    const result = await searchSegmentProjectMatches(segments, service, 5);

    expect(searchSpy).toHaveBeenCalledTimes(3);
    expect(result).toHaveLength(3);
    expect(result.map((segment) => segment.topic)).toEqual(["first", "second", "third"]);
    expect(result[0]?.projectMatches[0]?.projectId).toBe("project-for-1");
    expect(result[1]?.projectMatches[0]?.projectId).toBe("project-for-2");
    expect(result[2]?.projectMatches[0]?.projectId).toBe("project-for-3");
    expect(result.every((segment) => "embedding" in segment)).toBe(true);
    expect(
      result.every((segment) =>
        segment.projectMatches.every((match) => !("embedding" in match))
      )
    ).toBe(true);
  });
});
