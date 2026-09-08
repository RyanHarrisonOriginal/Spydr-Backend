import { describe, expect, it, vi } from "vitest";
import { generateSegmentEmbeddings } from "../generate-segment-embeddings.js";
import { ActiveNoteAnalysisError } from "../types/index.js";

const segments = [
  {
    topic: "Launch plan",
    sourceText: "Ship the beta next week",
    contextualText: "Project launch: ship the beta next week",
  },
  {
    topic: "Follow up",
    sourceText: "Email the design team",
    contextualText: "Follow up: email the design team about mockups",
  },
];

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("generateSegmentEmbeddings", () => {
  it("returns an embedding for every segment", async () => {
    const generateEmbedding = vi
      .fn()
      .mockResolvedValueOnce([0.1, 0.2])
      .mockResolvedValueOnce([0.3, 0.4]);

    const result = await generateSegmentEmbeddings(segments, generateEmbedding);

    expect(result).toHaveLength(2);
    expect(result[0]?.embedding).toEqual([0.1, 0.2]);
    expect(result[1]?.embedding).toEqual([0.3, 0.4]);
  });

  it("passes contextualText to the embedding service", async () => {
    const generateEmbedding = vi.fn().mockResolvedValue([0.5]);

    await generateSegmentEmbeddings(segments, generateEmbedding);

    expect(generateEmbedding).toHaveBeenNthCalledWith(
      1,
      "Project launch: ship the beta next week"
    );
    expect(generateEmbedding).toHaveBeenNthCalledWith(
      2,
      "Follow up: email the design team about mockups"
    );
    expect(generateEmbedding).not.toHaveBeenCalledWith(segments[0]?.sourceText);
  });

  it("embeds multiple segments concurrently", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const generateEmbedding = vi.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await delay(25);
      inFlight -= 1;
      return [0.1];
    });

    await generateSegmentEmbeddings(segments, generateEmbedding);

    expect(generateEmbedding).toHaveBeenCalledTimes(2);
    expect(maxInFlight).toBe(2);
  });

  it("preserves the original segment order", async () => {
    const generateEmbedding = vi
      .fn()
      .mockImplementation(async (text: string) => {
        if (text.startsWith("Follow up")) {
          await delay(5);
          return [0.9];
        }

        await delay(20);
        return [0.1];
      });

    const result = await generateSegmentEmbeddings(segments, generateEmbedding);

    expect(result.map((segment) => segment.topic)).toEqual([
      "Launch plan",
      "Follow up",
    ]);
  });

  it("propagates embedding failures", async () => {
    const generateEmbedding = vi
      .fn()
      .mockRejectedValue(new Error("OpenAI unavailable"));

    await expect(generateSegmentEmbeddings(segments, generateEmbedding)).rejects.toThrow(
      "OpenAI unavailable"
    );
  });

  it("stores trimmed contextualText on embedded segments", async () => {
    const generateEmbedding = vi.fn().mockResolvedValue([0.5]);

    const result = await generateSegmentEmbeddings(
      [
        {
          topic: "Whitespace",
          sourceText: "raw source",
          contextualText: "  trimmed contextual  ",
        },
      ],
      generateEmbedding
    );

    expect(result[0]?.contextualText).toBe("trimmed contextual");
    expect(generateEmbedding).toHaveBeenCalledWith("trimmed contextual");
  });

  it("rejects segments with empty contextualText", async () => {
    const generateEmbedding = vi.fn();

    await expect(
      generateSegmentEmbeddings(
        [
          {
            topic: "Empty",
            sourceText: "still has source",
            contextualText: "   ",
          },
        ],
        generateEmbedding
      )
    ).rejects.toBeInstanceOf(ActiveNoteAnalysisError);

    expect(generateEmbedding).not.toHaveBeenCalled();
  });

  it("rejects empty embedding vectors", async () => {
    const generateEmbedding = vi.fn().mockResolvedValue([]);

    await expect(
      generateSegmentEmbeddings([segments[0]!], generateEmbedding)
    ).rejects.toThrow("Embedding generation returned an empty vector");
  });
});
