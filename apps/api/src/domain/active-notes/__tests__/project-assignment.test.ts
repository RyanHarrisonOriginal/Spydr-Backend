import { describe, expect, it } from "vitest";
import {
  buildProjectFitInput,
  buildProjectFitUserInput,
  extractProjectNameFromRetrievalDocument,
  inferStubProjectAssignments,
  parseActiveNoteProjectAssignmentOutput,
  toProjectAssignmentCandidate,
  type SegmentWithProjectMatches,
} from "../../index.js";

function createSegment(
  overrides: Partial<SegmentWithProjectMatches> = {}
): SegmentWithProjectMatches {
  return {
    topic: "Launch planning",
    sourceText: "Plan the launch",
    contextualText: "Plan the product launch",
    embedding: [0.1, 0.2],
    projectMatches: [],
    ...overrides,
  };
}

function assertPayloadExcludesSimilarity(payload: unknown) {
  const serialized = JSON.stringify(payload);
  expect(serialized).not.toMatch(/similarity/i);
  expect(serialized).not.toMatch(/embedding/i);
  expect(serialized).not.toMatch(/"rank"/i);
  expect(serialized).not.toMatch(/distance/i);

  if (payload && typeof payload === "object" && "candidate" in payload) {
    const candidate = (payload as { candidate: unknown }).candidate;
    expect(candidate).not.toHaveProperty("similarity");
    expect(candidate).not.toHaveProperty("embedding");
    expect(candidate).not.toHaveProperty("rank");
    expect(candidate).not.toHaveProperty("distance");
  }
}

describe("extractProjectNameFromRetrievalDocument", () => {
  it("reads the project title from the retrieval document header", () => {
    expect(
      extractProjectNameFromRetrievalDocument(
        "PROJECT: Commercial Scorecard\n\nDESCRIPTION:\nRollout plan"
      )
    ).toBe("Commercial Scorecard");
  });
});

describe("toProjectAssignmentCandidate", () => {
  it("maps retrieval documents to candidate input without similarity scores", () => {
    const segment = createSegment({
      projectMatches: [
        {
          projectId: "project-1",
          similarity: 0.82,
          retrievalDocument: "PROJECT: Inventory App\n\nOPEN TASKS:\n- Align teams",
        },
      ],
    });

    const candidate = toProjectAssignmentCandidate(segment.projectMatches[0]!);
    const payload = JSON.parse(buildProjectFitUserInput(segment, candidate));

    expect(candidate).toEqual({
      projectId: "project-1",
      projectName: "Inventory App",
      retrievalContext: "PROJECT: Inventory App\n\nOPEN TASKS:\n- Align teams",
    });
    expect(payload).toEqual({
      topic: "Launch planning",
      sourceText: "Plan the launch",
      contextualText: "Plan the product launch",
      candidate,
    });
    assertPayloadExcludesSimilarity(payload);
    expect(buildProjectFitInput(segment, candidate)).toEqual(payload);
  });
});

describe("parseActiveNoteProjectAssignmentOutput", () => {
  it("accepts a valid existing project assignment", () => {
    const segment = createSegment({
      sourceText: "Plan the launch",
      projectMatches: [
        {
          projectId: "project-1",
          similarity: 0.91,
          retrievalDocument: "PROJECT: Launch Plan",
        },
      ],
    });

    expect(
      parseActiveNoteProjectAssignmentOutput(
        {
          originalText: "Plan the launch",
          destination: "existing_project",
          projectId: "project-1",
          projectName: "Launch Plan",
          matchBasis: "project_scope",
          confidence: 0.94,
          reason: "Continues launch planning work.",
        },
        segment
      )
    ).toEqual({
      originalText: "Plan the launch",
      destination: "existing_project",
      projectId: "project-1",
      projectName: "Launch Plan",
      matchBasis: "project_scope",
      confidence: 0.94,
      reason: "Continues launch planning work.",
    });
  });

  it("rejects mismatched originalText", () => {
    const segment = createSegment({ sourceText: "Plan the launch" });

    expect(() =>
      parseActiveNoteProjectAssignmentOutput(
        {
          originalText: "Different text",
          destination: "unassigned",
          projectId: null,
          projectName: null,
          matchBasis: "none",
          confidence: 0.4,
          reason: "No fit.",
        },
        segment
      )
    ).toThrow(/mismatched originalText/);
  });

  it("rejects existing_project with matchBasis none", () => {
    const segment = createSegment({
      projectMatches: [
        {
          projectId: "project-1",
          similarity: 0.9,
          retrievalDocument: "PROJECT: Launch Plan",
        },
      ],
    });

    expect(() =>
      parseActiveNoteProjectAssignmentOutput(
        {
          originalText: "Plan the launch",
          destination: "existing_project",
          projectId: "project-1",
          projectName: "Launch Plan",
          matchBasis: "none",
          confidence: 0.9,
          reason: "Weak match.",
        },
        segment
      )
    ).toThrow();
  });

  it("rejects invented project IDs", () => {
    const segment = createSegment({
      projectMatches: [
        {
          projectId: "project-1",
          similarity: 0.9,
          retrievalDocument: "PROJECT: Launch Plan",
        },
      ],
    });

    expect(() =>
      parseActiveNoteProjectAssignmentOutput(
        {
          originalText: "Plan the launch",
          destination: "existing_project",
          projectId: "invented-project",
          projectName: "Launch Plan",
          matchBasis: "project_scope",
          confidence: 0.9,
          reason: "Invented project.",
        },
        segment
      )
    ).toThrow(/unknown projectId/);
  });

  it("rejects modified existing project names", () => {
    const segment = createSegment({
      projectMatches: [
        {
          projectId: "project-1",
          similarity: 0.9,
          retrievalDocument: "PROJECT: Launch Plan",
        },
      ],
    });

    expect(() =>
      parseActiveNoteProjectAssignmentOutput(
        {
          originalText: "Plan the launch",
          destination: "existing_project",
          projectId: "project-1",
          projectName: "Renamed Launch Plan",
          matchBasis: "project_scope",
          confidence: 0.9,
          reason: "Modified name.",
        },
        segment
      )
    ).toThrow(/mismatched projectName/);
  });
});

describe("project assignment regression scenarios", () => {
  it("Florida false-positive: must not assign Florida Load Adjustment on shared wording alone", () => {
    const sourceText =
      "We still need to align with the Florida team on the inventory app so we don't end up with two different solutions solving the same problem.";
    const segment = createSegment({
      topic: "Inventory app alignment",
      sourceText,
      contextualText: sourceText,
      projectMatches: [
        {
          projectId: "florida-load-adjustment",
          similarity: 0.86,
          retrievalDocument:
            "PROJECT: Florida Load Adjustment\n\nDESCRIPTION:\nAdjust Florida inventory loads.",
        },
      ],
    });

    const candidate = toProjectAssignmentCandidate(segment.projectMatches[0]!);
    const payload = buildProjectFitInput(segment, candidate);
    assertPayloadExcludesSimilarity(payload);
    expect(payload.candidate.projectName).toBe("Florida Load Adjustment");

    expect(
      parseActiveNoteProjectAssignmentOutput(
        {
          originalText: sourceText,
          destination: "unassigned",
          projectId: null,
          projectName: null,
          matchBasis: "none",
          confidence: 0.78,
          reason:
            "The segment concerns inventory app alignment across teams, not Florida load adjustment work represented by the candidate Project.",
        },
        segment
      )
    ).toMatchObject({
      destination: "unassigned",
      projectId: null,
      projectName: null,
      matchBasis: "none",
    });
  });

  it("Snowflake false-positive: must not assign Sales Agent DMH because the project uses Snowflake", () => {
    const sourceText =
      "I decided that querying Snowflake directly should remain our preferred fallback whenever the Power BI semantic models become too restrictive.";
    const segment = createSegment({
      topic: "Data platform fallback",
      sourceText,
      contextualText: sourceText,
      projectMatches: [
        {
          projectId: "sales-agent-dmh",
          similarity: 0.84,
          retrievalDocument:
            "PROJECT: Sales Agent DMH\n\nDESCRIPTION:\nSales agent tooling backed by Snowflake.",
        },
      ],
    });

    const candidate = toProjectAssignmentCandidate(segment.projectMatches[0]!);
    assertPayloadExcludesSimilarity(buildProjectFitInput(segment, candidate));

    expect(
      parseActiveNoteProjectAssignmentOutput(
        {
          originalText: sourceText,
          destination: "unassigned",
          projectId: null,
          projectName: null,
          matchBasis: "none",
          confidence: 0.81,
          reason:
            "The segment is a general Snowflake versus Power BI fallback decision and does not continue work inside the Sales Agent DMH Project.",
        },
        segment
      )
    ).toMatchObject({
      destination: "unassigned",
      matchBasis: "none",
    });
  });

  it("strong task match: routes to existing_project with matchBasis existing_task", () => {
    const sourceText =
      "I need to validate the quarter-to-date calculations one more time.";
    const segment = createSegment({
      topic: "QTD validation",
      sourceText,
      contextualText: sourceText,
      projectMatches: [
        {
          projectId: "commercial-scorecard-v2",
          similarity: 0.79,
          retrievalDocument:
            "PROJECT: Commercial Scorecard v2\n\nOPEN TASKS:\n- Tie out all QTD metrics on Commercial Scorecard v2",
        },
      ],
    });

    expect(
      parseActiveNoteProjectAssignmentOutput(
        {
          originalText: sourceText,
          destination: "existing_project",
          projectId: "commercial-scorecard-v2",
          projectName: "Commercial Scorecard v2",
          matchBasis: "existing_task",
          confidence: 0.95,
          reason:
            "The segment concerns QTD validation and this Project contains an open Task specifically for tying out QTD metrics.",
        },
        segment
      )
    ).toMatchObject({
      destination: "existing_project",
      projectId: "commercial-scorecard-v2",
      projectName: "Commercial Scorecard v2",
      matchBasis: "existing_task",
    });
  });

  it("strong project reference: routes to existing_project when the segment names the project", () => {
    const sourceText =
      "We should keep the Commercial Scorecard rollout on track for next week's review.";
    const segment = createSegment({
      topic: "Commercial Scorecard rollout",
      sourceText,
      contextualText: sourceText,
      projectMatches: [
        {
          projectId: "commercial-scorecard-v2",
          similarity: 0.77,
          retrievalDocument:
            "PROJECT: Commercial Scorecard v2\n\nDESCRIPTION:\nRollout of the Commercial Scorecard.",
        },
      ],
    });

    expect(
      parseActiveNoteProjectAssignmentOutput(
        {
          originalText: sourceText,
          destination: "existing_project",
          projectId: "commercial-scorecard-v2",
          projectName: "Commercial Scorecard v2",
          matchBasis: "direct_project_reference",
          confidence: 0.93,
          reason:
            "The segment explicitly references the Commercial Scorecard rollout, which is the initiative owned by this Project.",
        },
        segment
      )
    ).toMatchObject({
      destination: "existing_project",
      projectId: "commercial-scorecard-v2",
      projectName: "Commercial Scorecard v2",
      matchBasis: "direct_project_reference",
    });
  });
});

describe("inferStubProjectAssignments", () => {
  it("does not auto-assign the top semantic match", async () => {
    const segment = createSegment({
      projectMatches: [
        {
          projectId: "project-1",
          similarity: 0.88,
          retrievalDocument: "PROJECT: Launch Plan",
        },
      ],
    });

    const [result] = await inferStubProjectAssignments([segment]);

    expect(result?.projectAssignment).toMatchObject({
      destination: "unassigned",
      projectId: null,
      projectName: null,
      matchBasis: "none",
    });
  });

  it("returns unassigned when no strong match exists", async () => {
    const segment = createSegment({
      projectMatches: [
        {
          projectId: "project-1",
          similarity: 0.42,
          retrievalDocument: "PROJECT: Launch Plan",
        },
      ],
    });

    const [result] = await inferStubProjectAssignments([segment]);

    expect(result?.projectAssignment).toMatchObject({
      destination: "unassigned",
      projectId: null,
      projectName: null,
      matchBasis: "none",
    });
  });
});
