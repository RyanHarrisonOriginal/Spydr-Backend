import type OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { EmbeddingGenerationError } from "./errors.js";
import { generateEmbedding } from "./generate-embedding.js";

const TEST_MODEL = "text-embedding-3-small";

function createMockClient(
  createImpl: OpenAI["embeddings"]["create"]
): OpenAI {
  return {
    embeddings: {
      create: createImpl,
    },
  } as unknown as OpenAI;
}

describe("generateEmbedding", () => {
  it("returns a numeric embedding vector on success", async () => {
    const create = vi.fn().mockResolvedValue({
      data: [{ embedding: [0.1, 0.2, 0.3] }],
    });
    const client = createMockClient(create);

    await expect(
      generateEmbedding("PROJECT: Launch Spydr AI", {
        client,
        model: TEST_MODEL,
      })
    ).resolves.toEqual([0.1, 0.2, 0.3]);

    expect(create).toHaveBeenCalledWith({
      model: TEST_MODEL,
      input: "PROJECT: Launch Spydr AI",
    });
  });

  it("throws when input text is empty", async () => {
    const create = vi.fn();
    const client = createMockClient(create);

    await expect(
      generateEmbedding("   ", { client, model: TEST_MODEL })
    ).rejects.toThrow(EmbeddingGenerationError);

    await expect(
      generateEmbedding("   ", { client, model: TEST_MODEL })
    ).rejects.toThrow("Retrieval document text is empty");

    expect(create).not.toHaveBeenCalled();
  });

  it("throws when OpenAI returns an empty embedding vector", async () => {
    const client = createMockClient(
      vi.fn().mockResolvedValue({
        data: [{ embedding: [] }],
      })
    );

    await expect(
      generateEmbedding("PROJECT: Test", { client, model: TEST_MODEL })
    ).rejects.toThrow("OpenAI returned an empty embedding vector");
  });

  it("throws when OpenAI returns a malformed embedding vector", async () => {
    const client = createMockClient(
      vi.fn().mockResolvedValue({
        data: [{ embedding: [0.1, "bad", 0.3] }],
      })
    );

    await expect(
      generateEmbedding("PROJECT: Test", { client, model: TEST_MODEL })
    ).rejects.toThrow(
      "OpenAI returned a malformed embedding vector at index 1"
    );
  });

  it("throws when OpenAI returns no embedding data", async () => {
    const client = createMockClient(
      vi.fn().mockResolvedValue({
        data: [],
      })
    );

    await expect(
      generateEmbedding("PROJECT: Test", { client, model: TEST_MODEL })
    ).rejects.toThrow("OpenAI returned an empty embedding vector");
  });

  it("propagates OpenAI API failures with a meaningful wrapper error", async () => {
    const client = createMockClient(
      vi.fn().mockRejectedValue(new Error("rate limit exceeded"))
    );

    await expect(
      generateEmbedding("PROJECT: Test", { client, model: TEST_MODEL })
    ).rejects.toThrow(
      "OpenAI embedding request failed: rate limit exceeded"
    );
  });
});
