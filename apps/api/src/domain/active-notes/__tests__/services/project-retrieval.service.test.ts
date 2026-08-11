import { PROJECT_EMBEDDING_VECTOR_DIMENSIONS } from "@spydr/ai";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PROJECT_SEARCH_LIMIT,
  MAX_PROJECT_SEARCH_LIMIT,
  ProjectRetrievalError,
  ProjectRetrievalService,
  resolveProjectSearchLimit,
} from "../../project-routing/services/project-retrieval.service.js";

const ORG_ID = "org-11111111-1111-1111-1111-111111111111";

function createEmbedding(value = 0.1): number[] {
  return Array.from({ length: PROJECT_EMBEDDING_VECTOR_DIMENSIONS }, () => value);
}

describe("ProjectRetrievalService.search", () => {
  it("returns highest cosine-similarity project first", async () => {
    const searchProjectsByEmbedding = vi.fn().mockResolvedValue([
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
    ]);

    const service = new ProjectRetrievalService({
      orgId: ORG_ID,
      searchProjectsByEmbedding,
    });

    const matches = await service.search(createEmbedding(), 5);

    expect(matches[0]?.projectId).toBe("project-high");
    expect(matches[0]?.similarity).toBe(0.91);
    expect(matches[1]?.projectId).toBe("project-low");
  });

  it("uses a default limit of 5", async () => {
    const searchProjectsByEmbedding = vi.fn().mockResolvedValue([]);

    const service = new ProjectRetrievalService({
      orgId: ORG_ID,
      searchProjectsByEmbedding,
    });

    await service.search(createEmbedding());

    expect(searchProjectsByEmbedding).toHaveBeenCalledWith({
      orgId: ORG_ID,
      embedding: createEmbedding(),
      limit: DEFAULT_PROJECT_SEARCH_LIMIT,
    });
  });

  it("supports a custom limit", async () => {
    const searchProjectsByEmbedding = vi.fn().mockResolvedValue([]);

    const service = new ProjectRetrievalService({
      orgId: ORG_ID,
      searchProjectsByEmbedding,
    });

    await service.search(createEmbedding(), 3);

    expect(searchProjectsByEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 3 })
    );
  });

  it("caps the limit at 20", async () => {
    expect(resolveProjectSearchLimit(100)).toBe(MAX_PROJECT_SEARCH_LIMIT);

    const searchProjectsByEmbedding = vi.fn().mockResolvedValue([]);

    const service = new ProjectRetrievalService({
      orgId: ORG_ID,
      searchProjectsByEmbedding,
    });

    await service.search(createEmbedding(), 100);

    expect(searchProjectsByEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({ limit: MAX_PROJECT_SEARCH_LIMIT })
    );
  });

  it("scopes search to the service organization", async () => {
    const searchProjectsByEmbedding = vi.fn().mockResolvedValue([]);

    const service = new ProjectRetrievalService({
      orgId: ORG_ID,
      searchProjectsByEmbedding,
    });

    await service.search(createEmbedding(), 5);

    expect(searchProjectsByEmbedding).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: ORG_ID })
    );
  });

  it("rejects invalid embeddings", async () => {
    const service = new ProjectRetrievalService({
      orgId: ORG_ID,
      searchProjectsByEmbedding: vi.fn(),
    });

    await expect(service.search([])).rejects.toThrow(ProjectRetrievalError);
    await expect(service.search([Number.NaN, 0.2])).rejects.toThrow(
      ProjectRetrievalError
    );
  });

  it("returns an empty array when no projects match", async () => {
    const service = new ProjectRetrievalService({
      orgId: ORG_ID,
      searchProjectsByEmbedding: vi.fn().mockResolvedValue([]),
    });

    await expect(service.search(createEmbedding(), 5)).resolves.toEqual([]);
  });

  it("does not return raw embeddings", async () => {
    const service = new ProjectRetrievalService({
      orgId: ORG_ID,
      searchProjectsByEmbedding: vi.fn().mockResolvedValue([
        {
          projectId: "project-1",
          similarity: 0.88,
          retrievalDocument: "PROJECT: Alpha",
        },
      ]),
    });

    const matches = await service.search(createEmbedding(), 5);

    expect(matches[0]).toEqual({
      projectId: "project-1",
      similarity: 0.88,
      retrievalDocument: "PROJECT: Alpha",
    });
    expect(matches[0]).not.toHaveProperty("embedding");
  });
});
