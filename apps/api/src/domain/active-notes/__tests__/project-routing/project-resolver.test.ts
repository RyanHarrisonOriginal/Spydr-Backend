import { describe, expect, it } from "vitest";
import {
  buildProjectResolverInput,
  inferSegmentProjectAssignmentFromFitEvaluations,
  inferStubProjectMatchResolution,
  parseProjectResolverOutput,
  projectResolutionToAssignment,
  type ProjectFitEvaluation,
  type SegmentWithProjectMatches,
} from "../../index.js";

function createSegment(
  overrides: Partial<SegmentWithProjectMatches> = {}
): SegmentWithProjectMatches {
  return {
    topic: "Commercial Scorecard",
    sourceText: "Example",
    contextualText: "Example",
    embedding: [0.1],
    projectMatches: [],
    ...overrides,
  };
}

describe("buildProjectResolverInput", () => {
  it("includes only match verdicts and excludes confidence", () => {
    const segment = createSegment({
      sourceText:
        "I need to add a rep-level trend view and validate the quarter-to-date calculations one more time before presenting the final version of the Commercial Scorecard.",
      contextualText:
        "I need to add a rep-level trend view and validate the quarter-to-date calculations one more time before presenting the final version of the Commercial Scorecard.",
    });

    const qualified: ProjectFitEvaluation[] = [
      {
        projectId: "commercial-scorecard-v2",
        projectName: "Commercial Scorecard v2",
        verdict: "match",
        matchBasis: "existing_task",
        confidence: 0.81,
        segmentEvidence: "validate the quarter-to-date calculations",
        projectEvidence: "Need to make sure QTD ties out for all levels",
        targetObjectId: null,
        targetObjectTitle: "Need to make sure QTD ties out for all levels",
        reason: "QTD task match.",
      },
      {
        projectId: "sales-performance-dashboard",
        projectName: "Sales Performance Dashboard",
        verdict: "match",
        matchBasis: "project_scope",
        confidence: 0.95,
        segmentEvidence: "rep-level trend view",
        projectEvidence: "One stop shop dashboard for SupplyOne sales reps",
        targetObjectId: null,
        targetObjectTitle: null,
        reason: "Broad dashboard scope.",
      },
      {
        projectId: "ignored",
        projectName: "Ignored",
        verdict: "no_match",
        matchBasis: "none",
        confidence: 0.9,
        segmentEvidence: null,
        projectEvidence: null,
        reason: "Rejected.",
      },
    ];

    const payload = buildProjectResolverInput(segment, qualified);

    expect(payload.candidates).toHaveLength(2);
    expect(JSON.stringify(payload)).not.toMatch(/confidence/i);
    expect(JSON.stringify(payload)).not.toMatch(/similarity/i);
    expect(payload.candidates[0]).toMatchObject({
      projectId: "commercial-scorecard-v2",
      matchBasis: "existing_task",
    });
  });
});

describe("parseProjectResolverOutput", () => {
  it("requires the selected candidate to exist with matching matchBasis", () => {
    const qualified: ProjectFitEvaluation[] = [
      {
        projectId: "commercial-scorecard-v2",
        projectName: "Commercial Scorecard v2",
        verdict: "match",
        matchBasis: "existing_task",
        confidence: 0.9,
        segmentEvidence: "validate the quarter-to-date calculations",
        projectEvidence: "Need to make sure QTD ties out for all levels",
        targetObjectId: null,
        targetObjectTitle: "Need to make sure QTD ties out for all levels",
        reason: "QTD task match.",
      },
    ];

    expect(
      parseProjectResolverOutput(
        {
          projectId: "commercial-scorecard-v2",
          projectName: "Commercial Scorecard v2",
          matchBasis: "existing_task",
          confidence: 0.92,
          reason: "The open QTD task specifically owns this work.",
        },
        qualified
      )
    ).toMatchObject({
      projectId: "commercial-scorecard-v2",
      matchBasis: "existing_task",
    });
  });
});

describe("project resolver regression scenarios", () => {
  it("chooses Commercial Scorecard v2 over Sales Performance Dashboard", async () => {
    const qualified: ProjectFitEvaluation[] = [
      {
        projectId: "commercial-scorecard-v2",
        projectName: "Commercial Scorecard v2",
        verdict: "match",
        matchBasis: "existing_task",
        confidence: 0.81,
        segmentEvidence: "validate the quarter-to-date calculations",
        projectEvidence: "Need to make sure QTD ties out for all levels",
        targetObjectId: null,
        targetObjectTitle: "Need to make sure QTD ties out for all levels",
        reason: "QTD task match.",
      },
      {
        projectId: "sales-performance-dashboard",
        projectName: "Sales Performance Dashboard",
        verdict: "match",
        matchBasis: "project_scope",
        confidence: 0.95,
        segmentEvidence: "rep-level trend view",
        projectEvidence: "One stop shop dashboard for SupplyOne sales reps",
        targetObjectId: null,
        targetObjectTitle: null,
        reason: "Broad dashboard scope.",
      },
    ];

    await expect(inferStubProjectMatchResolution(qualified)).resolves.toMatchObject(
      {
        projectId: "commercial-scorecard-v2",
        matchBasis: "existing_task",
      }
    );
  });

  it("assigns through comparative resolver when multiple candidates match", async () => {
    const sourceText =
      "I need to add a rep-level trend view and validate the quarter-to-date calculations one more time before presenting the final version of the Commercial Scorecard.";
    const segment = createSegment({
      sourceText,
      contextualText: sourceText,
      projectMatches: [
        {
          projectId: "commercial-scorecard-v2",
          similarity: 0.99,
          retrievalDocument:
            "PROJECT: Commercial Scorecard v2\n\nOPEN TASKS:\n- Need to make sure QTD ties out for all levels",
        },
        {
          projectId: "sales-performance-dashboard",
          similarity: 0.5,
          retrievalDocument:
            "PROJECT: Sales Performance Dashboard\n\nDESCRIPTION:\nOne stop shop dashboard for SupplyOne sales reps",
        },
      ],
    });

    const assignment = await inferSegmentProjectAssignmentFromFitEvaluations(
      segment,
      {
        evaluateProjectFit: async (_segment, candidate) => {
          if (candidate.projectId === "commercial-scorecard-v2") {
            return {
              projectId: candidate.projectId,
              projectName: candidate.projectName,
              verdict: "match",
              matchBasis: "existing_task",
              confidence: 0.81,
              segmentEvidence: "validate the quarter-to-date calculations",
              projectEvidence: "Need to make sure QTD ties out for all levels",
              targetObjectId: null,
              targetObjectTitle: "Need to make sure QTD ties out for all levels",
              reason: "QTD task match.",
            };
          }

          return {
            projectId: candidate.projectId,
            projectName: candidate.projectName,
            verdict: "match",
            matchBasis: "project_scope",
            confidence: 0.95,
            segmentEvidence: "rep-level trend view",
            projectEvidence: "One stop shop dashboard for SupplyOne sales reps",
            targetObjectId: null,
            targetObjectTitle: null,
            reason: "Broad dashboard scope.",
          };
        },
        resolveProjectMatch: async (_segment, qualifiedEvaluations) =>
          inferStubProjectMatchResolution(qualifiedEvaluations),
        classifyUnassignedDestination: async (currentSegment) => ({
          originalText: currentSegment.sourceText,
          destination: "unassigned",
          projectId: null,
          projectName: null,
          matchBasis: "none",
          confidence: 0.4,
          reason: "No match.",
        }),
      }
    );

    expect(assignment).toMatchObject({
      destination: "existing_project",
      projectId: "commercial-scorecard-v2",
      matchBasis: "existing_task",
    });

    expect(
      projectResolutionToAssignment(segment, {
        projectId: "commercial-scorecard-v2",
        projectName: "Commercial Scorecard v2",
        matchBasis: "existing_task",
        confidence: 0.92,
        reason: "Resolved to the task-specific Project.",
      })
    ).toMatchObject({
      destination: "existing_project",
      projectId: "commercial-scorecard-v2",
    });
  });
});
