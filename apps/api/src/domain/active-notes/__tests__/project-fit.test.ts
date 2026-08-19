import { describe, expect, it } from "vitest";
import {
  inferSegmentProjectAssignmentFromFitEvaluations,
  projectFitEvaluationToAssignment,
  resolveProjectAssignmentFromFitEvaluations,
  type ProjectAssignmentCandidate,
  type ProjectFitEvaluation,
  type SegmentWithProjectMatches,
} from "../index.js";
import {
  buildProjectFitInput,
  buildProjectFitUserInput,
} from "../../../infra/ai/active-notes/assignment/fit/build-prompt-input.js";
import { parseProjectFitEvaluationOutput } from "../../../infra/ai/active-notes/assignment/fit/parse.js";

function createSegment(
  overrides: Partial<SegmentWithProjectMatches> = {}
): SegmentWithProjectMatches {
  return {
    topic: "Active note",
    sourceText: "Example segment",
    contextualText: "Example segment",
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
}

function createCandidate(
  overrides: Partial<ProjectAssignmentCandidate> = {}
): ProjectAssignmentCandidate {
  return {
    projectId: "project-1",
    projectName: "Example Project",
    retrievalContext: "PROJECT: Example Project",
    ...overrides,
  };
}

describe("buildProjectFitUserInput", () => {
  it("builds one candidate payload without similarity metadata", () => {
    const segment = createSegment({
      topic: "Inventory alignment",
      sourceText: "Align the inventory app",
      contextualText: "Align the inventory app across teams",
    });
    const candidate = createCandidate({
      projectId: "inventory-app",
      projectName: "Inventory App",
      retrievalContext: "PROJECT: Inventory App\n\nOPEN TASKS:\n- Align teams",
    });

    const payload = JSON.parse(buildProjectFitUserInput(segment, candidate));

    expect(payload).toEqual({
      topic: "Inventory alignment",
      sourceText: "Align the inventory app",
      contextualText: "Align the inventory app across teams",
      candidate: {
        projectId: "inventory-app",
        projectName: "Inventory App",
        retrievalContext: "PROJECT: Inventory App\n\nOPEN TASKS:\n- Align teams",
      },
    });
    expect(buildProjectFitInput(segment, candidate)).toEqual(payload);
    assertPayloadExcludesSimilarity(payload);
  });
});

describe("parseProjectFitEvaluationOutput", () => {
  it("rejects invented project IDs by downgrading to insufficient_evidence", () => {
    const segment = createSegment();
    const candidate = createCandidate({ projectId: "project-1" });

    expect(
      parseProjectFitEvaluationOutput(
        {
          projectId: "invented",
          projectName: candidate.projectName,
          verdict: "no_match",
          matchBasis: "none",
          confidence: 0.4,
          segmentEvidence: null,
          projectEvidence: null,
          targetObjectId: null,
          targetObjectTitle: null,
          reason: "No match.",
        },
        candidate,
        segment
      )
    ).toMatchObject({
      verdict: "insufficient_evidence",
      projectId: candidate.projectId,
    });
  });

  it("downgrades match with missing targetObjectTitle to insufficient_evidence", () => {
    const segment = createSegment({
      sourceText: "Validate the quarter-to-date calculations",
      contextualText: "Validate the quarter-to-date calculations",
    });
    const candidate = createCandidate({
      retrievalContext:
        "PROJECT: Example Project\n\nOPEN TASKS:\n- Need to make sure QTD ties out for all levels",
    });

    expect(
      parseProjectFitEvaluationOutput(
        {
          projectId: candidate.projectId,
          projectName: candidate.projectName,
          verdict: "match",
          matchBasis: "existing_task",
          confidence: 0.92,
          segmentEvidence: "quarter-to-date calculations",
          projectEvidence: "Need to make sure QTD ties out for all levels",
          targetObjectId: null,
          targetObjectTitle: null,
          reason: "Missing target title.",
        },
        candidate,
        segment
      )
    ).toMatchObject({
      verdict: "insufficient_evidence",
    });
  });

  it("rejects invented segment evidence by downgrading to insufficient_evidence", () => {
    const segment = createSegment({ sourceText: "Plan the launch" });
    const candidate = createCandidate();

    expect(
      parseProjectFitEvaluationOutput(
        {
          projectId: candidate.projectId,
          projectName: candidate.projectName,
          verdict: "match",
          matchBasis: "project_scope",
          confidence: 0.9,
          segmentEvidence: "Invented excerpt",
          projectEvidence: "Example Project",
          targetObjectId: null,
          targetObjectTitle: null,
          reason: "Invalid evidence.",
        },
        candidate,
        segment
      )
    ).toMatchObject({
      verdict: "insufficient_evidence",
      matchBasis: "none",
      segmentEvidence: null,
      projectEvidence: null,
    });
  });

  it("accepts project evidence when whitespace differs from retrieval context", () => {
    const segment = createSegment({
      sourceText: "Validate the quarter-to-date calculations",
      contextualText: "Validate the quarter-to-date calculations",
    });
    const candidate = createCandidate({
      retrievalContext:
        "PROJECT: Example Project\n\nOPEN TASKS:\n- Need to make sure QTD ties out for all levels",
    });

    expect(
      parseProjectFitEvaluationOutput(
        {
          projectId: candidate.projectId,
          projectName: candidate.projectName,
          verdict: "match",
          matchBasis: "existing_task",
          confidence: 0.92,
          segmentEvidence: "quarter-to-date calculations",
          projectEvidence: "Need to make sure QTD ties out for all levels",
          targetObjectId: null,
          targetObjectTitle: "Need to make sure QTD ties out for all levels",
          reason: "Matches the open QTD task.",
        },
        candidate,
        segment
      )
    ).toMatchObject({
      verdict: "match",
      matchBasis: "existing_task",
    });
  });

  it("rejects match when targetObjectTitle is not in retrieval context", () => {
    const segment = createSegment({
      sourceText: "Validate the quarter-to-date calculations",
      contextualText: "Validate the quarter-to-date calculations",
    });
    const candidate = createCandidate({
      retrievalContext:
        "PROJECT: Example Project\n\nOPEN TASKS:\n- Need to make sure QTD ties out for all levels",
    });

    expect(
      parseProjectFitEvaluationOutput(
        {
          projectId: candidate.projectId,
          projectName: candidate.projectName,
          verdict: "match",
          matchBasis: "existing_task",
          confidence: 0.92,
          segmentEvidence: "quarter-to-date calculations",
          projectEvidence: "Need to make sure QTD ties out for all levels",
          targetObjectId: null,
          targetObjectTitle: "Invented task title",
          reason: "Invalid target title.",
        },
        candidate,
        segment
      )
    ).toMatchObject({
      verdict: "insufficient_evidence",
    });
  });
});

describe("resolveProjectAssignmentFromFitEvaluations", () => {
  it("assigns the sole matching candidate", () => {
    const evaluation: ProjectFitEvaluation = {
      projectId: "project-1",
      projectName: "Launch Plan",
      verdict: "match",
      matchBasis: "project_scope",
      confidence: 0.91,
      segmentEvidence: "Plan the launch",
      projectEvidence: "Launch Plan",
      targetObjectId: null,
      targetObjectTitle: null,
      reason: "Direct scope match.",
    };

    expect(resolveProjectAssignmentFromFitEvaluations([evaluation])).toEqual({
      kind: "existing_project",
      evaluation,
    });
  });

  it("ignores no_match and insufficient_evidence verdicts", () => {
    expect(
      resolveProjectAssignmentFromFitEvaluations([
        {
          projectId: "project-1",
          projectName: "Project One",
          verdict: "no_match",
          matchBasis: "none",
          confidence: 0.9,
          segmentEvidence: null,
          projectEvidence: null,
          reason: "No match.",
        },
        {
          projectId: "project-2",
          projectName: "Project Two",
          verdict: "insufficient_evidence",
          matchBasis: "none",
          confidence: 0.8,
          segmentEvidence: null,
          projectEvidence: null,
          reason: "Uncertain.",
        },
      ])
    ).toEqual({ kind: "no_matches" });
  });

  it("routes multiple matches to the comparative resolver", () => {
    const first: ProjectFitEvaluation = {
      projectId: "project-1",
      projectName: "Project One",
      verdict: "match",
      matchBasis: "existing_task",
      confidence: 0.91,
      segmentEvidence: "task one",
      projectEvidence: "Task one",
      targetObjectId: null,
      targetObjectTitle: "Task one",
      reason: "First match.",
    };
    const second: ProjectFitEvaluation = {
      projectId: "project-2",
      projectName: "Project Two",
      verdict: "match",
      matchBasis: "project_scope",
      confidence: 0.99,
      segmentEvidence: "task two",
      projectEvidence: "Task two",
      targetObjectId: null,
      targetObjectTitle: null,
      reason: "Second match with higher confidence.",
    };

    expect(
      resolveProjectAssignmentFromFitEvaluations([first, second])
    ).toEqual({
      kind: "multiple_matches",
      evaluations: [first, second],
    });
  });
});

describe("project fit regression scenarios", () => {
  it("Florida false-positive: verdict = no_match", () => {
    const sourceText =
      "We still need to align with the Florida team on the inventory app so we don't end up with two different solutions solving the same problem.";
    const segment = createSegment({
      sourceText,
      contextualText: sourceText,
    });
    const candidate = createCandidate({
      projectId: "florida-load-adjustment",
      projectName: "Florida Load Adjustment",
      retrievalContext:
        "PROJECT: Florida Load Adjustment\n\nDESCRIPTION:\nAdjust Florida inventory loads.",
    });

    expect(
      parseProjectFitEvaluationOutput(
        {
          projectId: candidate.projectId,
          projectName: candidate.projectName,
          verdict: "no_match",
          matchBasis: "none",
          confidence: 0.82,
          segmentEvidence: null,
          projectEvidence: null,
          targetObjectId: null,
          targetObjectTitle: null,
          reason:
            "Florida Load Adjustment does not own regional inventory-app coordination.",
        },
        candidate,
        segment
      )
    ).toMatchObject({ verdict: "no_match", matchBasis: "none" });
  });

  it("Snowflake false-positive: verdict = no_match", () => {
    const sourceText =
      "I decided that querying Snowflake directly should remain our preferred fallback whenever the Power BI semantic models become too restrictive.";
    const segment = createSegment({
      sourceText,
      contextualText: sourceText,
    });
    const candidate = createCandidate({
      projectId: "sales-agent-dmh",
      projectName: "Sales Agent DMH",
      retrievalContext:
        "PROJECT: Sales Agent DMH\n\nOPEN TASKS:\n- Automate Sales Agent data writeback to Snowflake\n\nRECENT DECISIONS:\n- Use PgBouncer",
    });

    expect(
      parseProjectFitEvaluationOutput(
        {
          projectId: candidate.projectId,
          projectName: candidate.projectName,
          verdict: "no_match",
          matchBasis: "none",
          confidence: 0.84,
          segmentEvidence: null,
          projectEvidence: null,
          targetObjectId: null,
          targetObjectTitle: null,
          reason:
            "Snowflake usage in this Project does not establish ownership of the broader fallback strategy.",
        },
        candidate,
        segment
      )
    ).toMatchObject({ verdict: "no_match" });
  });

  it("strong QTD match: verdict = match with matchBasis existing_task", () => {
    const sourceText =
      "I need to validate the quarter-to-date calculations one more time.";
    const segment = createSegment({
      sourceText,
      contextualText: sourceText,
    });
    const candidate = createCandidate({
      projectId: "commercial-scorecard-v2",
      projectName: "Commercial Scorecard v2",
      retrievalContext:
        "PROJECT: Commercial Scorecard v2\n\nOPEN TASKS:\n- Tie out all metrics on all levels on Commercial Scorecard v2\n- Need to make sure QTD ties out for all levels",
    });
    const projectEvidence = "- Need to make sure QTD ties out for all levels";

    const evaluation = parseProjectFitEvaluationOutput(
      {
        projectId: candidate.projectId,
        projectName: candidate.projectName,
        verdict: "match",
        matchBasis: "existing_task",
        confidence: 0.96,
        segmentEvidence: "validate the quarter-to-date calculations",
        projectEvidence,
        targetObjectId: null,
        targetObjectTitle: "Need to make sure QTD ties out for all levels",
        reason: "The segment continues the open QTD tie-out Task.",
      },
      candidate,
      segment
    );

    expect(evaluation).toMatchObject({
      verdict: "match",
      matchBasis: "existing_task",
    });

    expect(
      projectFitEvaluationToAssignment(createSegment({ sourceText }), evaluation)
    ).toMatchObject({
      destination: "existing_project",
      projectId: "commercial-scorecard-v2",
      matchBasis: "existing_task",
    });
  });

  it("accepts direct named-initiative references with minor naming differences", () => {
    const sourceText =
      "Amy liked the overall direction of the Commercial Scorecard rollout but wants managers to have a clearer way to compare rep performance over time.";
    const segment = createSegment({
      sourceText,
      contextualText: sourceText,
    });
    const candidate = createCandidate({
      projectId: "commercial-scorecard-v2",
      projectName: "Commercial Scorecard v2",
      retrievalContext:
        "PROJECT: Commercial Scorecard v2\n\nOPEN TASKS:\n- Present Commercial Scorecard v2 to Amy for final sign off",
    });

    expect(
      parseProjectFitEvaluationOutput(
        {
          projectId: candidate.projectId,
          projectName: candidate.projectName,
          verdict: "match",
          matchBasis: "direct_project_reference",
          confidence: 0.94,
          segmentEvidence: "Commercial Scorecard rollout",
          projectEvidence: "Commercial Scorecard rollout",
          targetObjectId: null,
          targetObjectTitle: null,
          reason:
            "The segment names the Commercial Scorecard rollout initiative represented by this Project.",
        },
        candidate,
        segment
      )
    ).toMatchObject({
      verdict: "match",
      matchBasis: "direct_project_reference",
    });
  });

  it("uncertain evaluation remains non-qualifying", () => {
    const segment = createSegment();
    const candidate = createCandidate();

    expect(
      parseProjectFitEvaluationOutput(
        {
          projectId: candidate.projectId,
          projectName: candidate.projectName,
          verdict: "insufficient_evidence",
          matchBasis: "none",
          confidence: 0.55,
          segmentEvidence: null,
          projectEvidence: null,
          targetObjectId: null,
          targetObjectTitle: null,
          reason: "Not enough evidence to confirm ownership.",
        },
        candidate,
        segment
      )
    ).toMatchObject({ verdict: "insufficient_evidence" });
  });
});

describe("inferSegmentProjectAssignmentFromFitEvaluations", () => {
  it("does not fall back to semantic ranking when no candidate matches", async () => {
    const segment = createSegment({
      sourceText: "Plan the launch",
      contextualText: "Plan the launch",
      projectMatches: [
        {
          projectId: "project-1",
          similarity: 0.99,
          retrievalDocument: "PROJECT: Launch Plan",
        },
      ],
    });

    const assignment = await inferSegmentProjectAssignmentFromFitEvaluations(
      segment,
      {
        evaluateFit: async (_segment, candidate) => ({
          projectId: candidate.projectId,
          projectName: candidate.projectName,
          verdict: "insufficient_evidence",
          matchBasis: "none",
          confidence: 0.4,
          segmentEvidence: null,
          projectEvidence: null,
          targetObjectId: null,
          targetObjectTitle: null,
          reason: "No fit.",
        }),
        resolveMatch: async () => {
          throw new Error("should not resolve multiple matches");
        },
        classifyUnassigned: async (currentSegment) => ({
          originalText: currentSegment.sourceText,
          destination: "unassigned",
          projectId: null,
          projectName: null,
          matchBasis: "none",
          confidence: 0.5,
          reason: "No matching Project.",
        }),
      }
    );

    expect(assignment).toMatchObject({
      destination: "unassigned",
      projectId: null,
    });
  });
});
