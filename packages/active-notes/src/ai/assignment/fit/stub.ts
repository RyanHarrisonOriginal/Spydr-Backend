import type {
  ProjectAssignmentCandidate,
  ProjectFitEvaluation,
  SegmentWithProjectMatches,
} from "../../../domain/index.js";

export async function inferStubProjectFitEvaluation(
  segment: SegmentWithProjectMatches,
  candidate: ProjectAssignmentCandidate
): Promise<ProjectFitEvaluation> {
  const segmentText = `${segment.sourceText} ${segment.contextualText}`.toLowerCase();
  const retrieval = candidate.retrievalContext;
  const projectName = candidate.projectName;

  if (
    projectName === "Florida Load Adjustment" &&
    segmentText.includes("florida") &&
    segmentText.includes("inventory app")
  ) {
    return {
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
        "Shared Florida and inventory wording does not show this Project owns regional inventory-app coordination.",
    };
  }

  if (
    projectName === "Sales Agent DMH" &&
    segmentText.includes("snowflake") &&
    segmentText.includes("power bi")
  ) {
    return {
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
        "A general Snowflake versus Power BI fallback decision does not belong inside the Sales Agent DMH Project.",
    };
  }

  if (
    projectName === "Commercial Scorecard v2" &&
    segmentText.includes("commercial scorecard rollout")
  ) {
    return {
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
        "The segment names the Commercial Scorecard rollout initiative, which is the same initiative as Commercial Scorecard v2.",
    };
  }

  if (
    projectName === "Commercial Scorecard v2" &&
    (segmentText.includes("rep-level trend view") ||
      segmentText.includes("quarter-to-date"))
  ) {
    const projectEvidence = "Need to make sure QTD ties out for all levels";
    if (retrieval.includes(projectEvidence)) {
      return {
        projectId: candidate.projectId,
        projectName: candidate.projectName,
        verdict: "match",
        matchBasis: "existing_task",
        confidence: 0.96,
        segmentEvidence: "validate the quarter-to-date calculations",
        projectEvidence,
        targetObjectId: null,
        targetObjectTitle: "Need to make sure QTD ties out for all levels",
        reason:
          "The segment continues QTD validation work represented by an open Task in this Project.",
      };
    }
  }

  if (
    projectName === "Sales Performance Dashboard" &&
    (segmentText.includes("rep-level") || segmentText.includes("commercial scorecard"))
  ) {
    return {
      projectId: candidate.projectId,
      projectName: candidate.projectName,
      verdict: "match",
      matchBasis: "project_scope",
      confidence: 0.72,
      segmentEvidence: "rep-level trend view",
      projectEvidence: "One stop shop dashboard for SupplyOne sales reps",
      targetObjectId: null,
      targetObjectTitle: null,
      reason:
        "The segment broadly concerns rep-level performance views, which overlaps the dashboard scope.",
    };
  }

  return {
    projectId: candidate.projectId,
    projectName: candidate.projectName,
    verdict: "insufficient_evidence",
    matchBasis: "none",
    confidence: 0.35,
    segmentEvidence: null,
    projectEvidence: null,
    targetObjectId: null,
    targetObjectTitle: null,
    reason: "Stub provider found no affirmative execution-scope evidence.",
  };
}
