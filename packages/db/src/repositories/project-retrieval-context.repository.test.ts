import { PROJECT_EMBEDDING_VECTOR_DIMENSIONS } from "@spydr/ai";
import { describe, expect, it, vi } from "vitest";
import { searchProjectsByEmbedding } from "./project-retrieval-context.repository.js";

const ORG_ID = "org-11111111-1111-1111-1111-111111111111";

function createEmbedding(value = 0.1): number[] {
  return Array.from({ length: PROJECT_EMBEDDING_VECTOR_DIMENSIONS }, () => value);
}

describe("searchProjectsByEmbedding", () => {
  it("orders results by ascending cosine distance", async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        project_id: "project-high",
        context_text: "PROJECT: High",
        similarity: 0.91,
      },
      {
        project_id: "project-low",
        context_text: "PROJECT: Low",
        similarity: 0.42,
      },
    ]);

    const matches = await searchProjectsByEmbedding(
      {
        orgId: ORG_ID,
        embedding: createEmbedding(),
        limit: 5,
      },
      { $queryRaw: queryRaw }
    );

    expect(matches).toEqual([
      {
        projectId: "project-high",
        similarity: 0.91,
        retrievalDocument: "PROJECT: High",
      },
      {
        projectId: "project-low",
        similarity: 0.42,
        retrievalDocument: "PROJECT: Low",
      },
    ]);
  });

  it("scopes search to the organization and active projects", async () => {
    const queryRaw = vi.fn().mockResolvedValue([]);

    await searchProjectsByEmbedding(
      {
        orgId: ORG_ID,
        embedding: createEmbedding(),
        limit: 5,
      },
      { $queryRaw: queryRaw }
    );

    const sql = queryRaw.mock.calls[0]?.[0]?.strings?.join(" ") ?? "";

    expect(sql).toContain("c.organization_id");
    expect(sql).toContain("n.org_id");
    expect(sql).toContain("n.is_deleted = false");
    expect(sql).toContain("n.node_type = 'project'");
    expect(sql).not.toContain("c.user_id =");
  });

  it("clamps similarity to the range [0, 1]", async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        project_id: "project-1",
        context_text: "PROJECT: One",
        similarity: 1.2,
      },
    ]);

    const matches = await searchProjectsByEmbedding(
      {
        orgId: ORG_ID,
        embedding: createEmbedding(),
        limit: 1,
      },
      { $queryRaw: queryRaw }
    );

    expect(matches[0]?.similarity).toBe(1);
  });

  it("does not expose raw embeddings in results", async () => {
    const queryRaw = vi.fn().mockResolvedValue([
      {
        project_id: "project-1",
        context_text: "PROJECT: One",
        similarity: 0.8,
      },
    ]);

    const matches = await searchProjectsByEmbedding(
      {
        orgId: ORG_ID,
        embedding: createEmbedding(),
        limit: 1,
      },
      { $queryRaw: queryRaw }
    );

    expect(matches[0]).not.toHaveProperty("embedding");
  });
});
