import { PROJECT_EMBEDDING_VECTOR_DIMENSIONS } from "@spydr/ai";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PROJECT_SEARCH_LIMIT,
  MAX_PROJECT_SEARCH_LIMIT,
  ProjectRetrievalError,
  resolveProjectSearchLimit,
  searchProjects,
} from "../search-projects.js";
import type { IProjectSearchPort } from "../ports/project-search.port.js";

const ORG_ID = "org-11111111-1111-1111-1111-111111111111";

function createEmbedding(value = 0.1): number[] {
  return Array.from({ length: PROJECT_EMBEDDING_VECTOR_DIMENSIONS }, () => value);
}

describe("searchProjects", () => {
  it("returns highest cosine-similarity project first", async () => {
    const projectSearch: IProjectSearchPort = {
      search: vi.fn().mockResolvedValue([
        {
          projectId: "project-high",
          similarity: 0.91,
          retrievalDocument: "PROJECT: High match",
        },
        {
          projectId: "project-low",
          similarity: 0.42,
          retrievalDocument: "PROJECT: Low match",
        },
      ]),
    };

    const matches = await searchProjects(
      projectSearch,
      ORG_ID,
      createEmbedding(),
      5
    );

    expect(matches[0]?.projectId).toBe("project-high");
    expect(matches[0]?.similarity).toBe(0.91);
    expect(matches[1]?.projectId).toBe("project-low");
  });

  it("uses a default limit of 5", async () => {
    const projectSearch: IProjectSearchPort = {
      search: vi.fn().mockResolvedValue([]),
    };

    await searchProjects(projectSearch, ORG_ID, createEmbedding());

    expect(projectSearch.search).toHaveBeenCalledWith(
      ORG_ID,
      createEmbedding(),
      DEFAULT_PROJECT_SEARCH_LIMIT
    );
  });

  it("supports a custom limit", async () => {
    const projectSearch: IProjectSearchPort = {
      search: vi.fn().mockResolvedValue([]),
    };

    await searchProjects(projectSearch, ORG_ID, createEmbedding(), 3);

    expect(projectSearch.search).toHaveBeenCalledWith(
      ORG_ID,
      createEmbedding(),
      3
    );
  });

  it("caps the limit at 20", async () => {
    expect(resolveProjectSearchLimit(100)).toBe(MAX_PROJECT_SEARCH_LIMIT);

    const projectSearch: IProjectSearchPort = {
      search: vi.fn().mockResolvedValue([]),
    };

    await searchProjects(projectSearch, ORG_ID, createEmbedding(), 100);

    expect(projectSearch.search).toHaveBeenCalledWith(
      ORG_ID,
      createEmbedding(),
      MAX_PROJECT_SEARCH_LIMIT
    );
  });

  it("scopes search to the organization", async () => {
    const projectSearch: IProjectSearchPort = {
      search: vi.fn().mockResolvedValue([]),
    };

    await searchProjects(projectSearch, ORG_ID, createEmbedding(), 5);

    expect(projectSearch.search).toHaveBeenCalledWith(
      ORG_ID,
      createEmbedding(),
      5
    );
  });

  it("rejects invalid embeddings", async () => {
    const projectSearch: IProjectSearchPort = {
      search: vi.fn(),
    };

    await expect(searchProjects(projectSearch, ORG_ID, [])).rejects.toThrow(
      ProjectRetrievalError
    );
    await expect(
      searchProjects(projectSearch, ORG_ID, [Number.NaN, 0.2])
    ).rejects.toThrow(ProjectRetrievalError);
  });

  it("returns an empty array when no projects match", async () => {
    const projectSearch: IProjectSearchPort = {
      search: vi.fn().mockResolvedValue([]),
    };

    await expect(
      searchProjects(projectSearch, ORG_ID, createEmbedding(), 5)
    ).resolves.toEqual([]);
  });

  it("does not return raw embeddings", async () => {
    const projectSearch: IProjectSearchPort = {
      search: vi.fn().mockResolvedValue([
        {
          projectId: "project-1",
          similarity: 0.88,
          retrievalDocument: "PROJECT: Alpha",
        },
      ]),
    };

    const matches = await searchProjects(
      projectSearch,
      ORG_ID,
      createEmbedding(),
      5
    );

    expect(matches[0]).toEqual({
      projectId: "project-1",
      similarity: 0.88,
      retrievalDocument: "PROJECT: Alpha",
    });
    expect(matches[0]).not.toHaveProperty("embedding");
  });
});
