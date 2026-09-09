import { JobUnrecoverableError } from "@spydr/shared";
import { describe, expect, it, vi } from "vitest";
import { EmbeddingGenerationError } from "@spydr/ai";
import { createRetrievalContentHash } from "@spydr/shared";
import { EmbeddingService } from "./embedding.service.js";

const TEST_MODEL = "text-embedding-3-small";
const PROJECT_ID = "project-1";
const ORG_ID = "org-1";
const USER_ID = "user-1";
const CONTEXT_TEXT = "PROJECT: Launch Spydr AI";
const CONTENT_HASH = createRetrievalContentHash(CONTEXT_TEXT);
const EMBEDDING = Array.from({ length: 1536 }, (_, index) => index / 1536);

function createService(overrides: ConstructorParameters<typeof EmbeddingService>[0] = {}) {
  return new EmbeddingService({
    findProjectForEmbedding: vi.fn().mockResolvedValue({
      id: PROJECT_ID,
      orgId: ORG_ID,
      userId: USER_ID,
    }),
    buildProjectRetrievalDocument: vi.fn().mockResolvedValue(CONTEXT_TEXT),
    findExistingProjectRetrievalContext: vi.fn().mockResolvedValue(null),
    generateEmbedding: vi.fn().mockResolvedValue(EMBEDDING),
    upsertProjectRetrievalContext: vi.fn().mockResolvedValue(undefined),
    createRetrievalContentHash,
    model: TEST_MODEL,
    ...overrides,
  });
}

describe("EmbeddingService.refreshProjectEmbedding", () => {
  it("creates a retrieval row for a new project context", async () => {
    const upsertProjectRetrievalContext = vi.fn().mockResolvedValue(undefined);
    const generateEmbedding = vi.fn().mockResolvedValue(EMBEDDING);
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const service = createService({
      upsertProjectRetrievalContext,
      generateEmbedding,
    });

    await service.refreshProjectEmbedding(PROJECT_ID);

    expect(generateEmbedding).toHaveBeenCalledWith(CONTEXT_TEXT, {
      model: TEST_MODEL,
    });
    expect(upsertProjectRetrievalContext).toHaveBeenCalledWith({
      projectId: PROJECT_ID,
      organizationId: ORG_ID,
      userId: USER_ID,
      contextText: CONTEXT_TEXT,
      embedding: EMBEDDING,
      contentHash: CONTENT_HASH,
    });
    expect(logSpy).toHaveBeenCalledWith(
      `[embedding] refreshProjectEmbedding succeeded (projectId=${PROJECT_ID}, contextChanged=true, embeddingSkipped=false, model=${TEST_MODEL}, dimensions=1536)`
    );

    logSpy.mockRestore();
  });

  it("generates a new embedding and upserts when the content hash changed", async () => {
    const generateEmbedding = vi.fn().mockResolvedValue(EMBEDDING);
    const upsertProjectRetrievalContext = vi.fn().mockResolvedValue(undefined);
    const service = createService({
      findExistingProjectRetrievalContext: vi.fn().mockResolvedValue({
        contentHash: "old-hash",
        embeddedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      generateEmbedding,
      upsertProjectRetrievalContext,
    });

    await service.refreshProjectEmbedding(PROJECT_ID);

    expect(generateEmbedding).toHaveBeenCalledOnce();
    expect(upsertProjectRetrievalContext).toHaveBeenCalledOnce();
  });

  it("skips OpenAI when the stored content hash is unchanged", async () => {
    const generateEmbedding = vi.fn();
    const upsertProjectRetrievalContext = vi.fn();
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const service = createService({
      findExistingProjectRetrievalContext: vi.fn().mockResolvedValue({
        contentHash: CONTENT_HASH,
        embeddedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      generateEmbedding,
      upsertProjectRetrievalContext,
    });

    await service.refreshProjectEmbedding(PROJECT_ID);

    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(upsertProjectRetrievalContext).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      `[embedding] refreshProjectEmbedding skipped (projectId=${PROJECT_ID}, contextChanged=false, embeddingSkipped=true, reason=content-hash-unchanged)`
    );

    logSpy.mockRestore();
  });

  it("uses organization and user IDs from the project record", async () => {
    const upsertProjectRetrievalContext = vi.fn().mockResolvedValue(undefined);
    const service = createService({
      findProjectForEmbedding: vi.fn().mockResolvedValue({
        id: PROJECT_ID,
        orgId: "resolved-org",
        userId: "resolved-user",
      }),
      upsertProjectRetrievalContext,
    });

    await service.refreshProjectEmbedding(PROJECT_ID);

    expect(upsertProjectRetrievalContext).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "resolved-org",
        userId: "resolved-user",
      })
    );
  });

  it("propagates persistence failures", async () => {
    const upsertProjectRetrievalContext = vi
      .fn()
      .mockRejectedValue(new Error("database write failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const service = createService({ upsertProjectRetrievalContext });

    await expect(service.refreshProjectEmbedding(PROJECT_ID)).rejects.toThrow(
      "database write failed"
    );

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`projectId=${PROJECT_ID}`)
    );

    errorSpy.mockRestore();
  });

  it("throws an unrecoverable error when the project is missing", async () => {
    const service = createService({
      findProjectForEmbedding: vi.fn().mockResolvedValue(null),
    });

    await expect(service.refreshProjectEmbedding(PROJECT_ID)).rejects.toBeInstanceOf(
      JobUnrecoverableError
    );
  });

  it("only persists when a new embedding is generated", async () => {
    const upsertProjectRetrievalContext = vi.fn().mockResolvedValue(undefined);
    const unchangedService = createService({
      findExistingProjectRetrievalContext: vi.fn().mockResolvedValue({
        contentHash: CONTENT_HASH,
        embeddedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      upsertProjectRetrievalContext,
    });

    await unchangedService.refreshProjectEmbedding(PROJECT_ID);
    expect(upsertProjectRetrievalContext).not.toHaveBeenCalled();

    const changedService = createService({
      findExistingProjectRetrievalContext: vi.fn().mockResolvedValue({
        contentHash: "previous-hash",
        embeddedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      upsertProjectRetrievalContext,
    });

    await changedService.refreshProjectEmbedding(PROJECT_ID);
    expect(upsertProjectRetrievalContext).toHaveBeenCalledOnce();
  });

  it("throws when the retrieval document is empty", async () => {
    const service = createService({
      buildProjectRetrievalDocument: vi.fn().mockResolvedValue("   "),
    });

    await expect(service.refreshProjectEmbedding(PROJECT_ID)).rejects.toThrow(
      EmbeddingGenerationError
    );
  });
});
