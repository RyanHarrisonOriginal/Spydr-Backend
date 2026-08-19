import { describe, expect, it } from "vitest";
import { stripPipelinePayload } from "./strip-pipeline-payload.js";

describe("stripPipelinePayload", () => {
  it("removes embedding vectors from nested pipeline payloads", () => {
    expect(
      stripPipelinePayload({
        embeddedSegments: [
          {
            topic: "Practice",
            sourceText: "Throw more teeps",
            embedding: [0.1, 0.2, 0.3],
            projectMatches: [
              {
                projectId: "proj-1",
                similarity: 0.9,
                retrievalDocument: "Muay Thai",
              },
            ],
          },
        ],
      })
    ).toEqual({
      embeddedSegments: [
        {
          topic: "Practice",
          sourceText: "Throw more teeps",
          projectMatches: [
            {
              projectId: "proj-1",
              similarity: 0.9,
              retrievalDocument: "Muay Thai",
            },
          ],
        },
      ],
    });
  });
});
