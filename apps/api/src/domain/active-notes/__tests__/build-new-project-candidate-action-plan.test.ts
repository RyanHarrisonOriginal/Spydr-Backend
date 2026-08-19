import { describe, expect, it } from "vitest";
import { attachSegmentLineageToActionPlan } from "../attach-segment-lineage-to-action-plan.js";
import { buildNewProjectCandidateActionPlan } from "../build-new-project-candidate-action-plan.js";
import { buildUnassignedActionPlan } from "../build-unassigned-action-plan.js";
import { buildActiveNoteOutput } from "../build-active-note-output.js";

const SEGMENT = {
  topic: "Fallback to Snowflake",
  sourceText:
    "I decided that querying Snowflake directly should remain our preferred fallback whenever the Power BI semantic models become too restrictive.",
  contextualText:
    "I decided that querying Snowflake directly should remain our preferred fallback solution whenever the Power BI semantic models become too restrictive.",
};

const ASSIGNMENT = {
  originalText: SEGMENT.sourceText,
  destination: "new_project_candidate" as const,
  projectId: null,
  projectName: "Snowflake Querying Strategy",
  matchBasis: "none" as const,
  confidence: 0.75,
  reason:
    "The segment outlines a specific strategy for using Snowflake as a fallback, indicating a distinct execution effort.",
};

describe("new project candidate action plans", () => {
  it("builds a new project candidate action plan from routing assignment", () => {
    expect(buildNewProjectCandidateActionPlan(ASSIGNMENT)).toEqual({
      destination: "new_project_candidate",
      originalText: SEGMENT.sourceText,
      projectId: null,
      projectName: "Snowflake Querying Strategy",
      confidence: 0.75,
      reason: ASSIGNMENT.reason,
    });
  });

  it("includes new project candidates in final actionPlans output", () => {
    const actionPlan = attachSegmentLineageToActionPlan(
      SEGMENT,
      buildNewProjectCandidateActionPlan(ASSIGNMENT)
    );

    const output = buildActiveNoteOutput({
      embeddedSegments: [
        {
          ...SEGMENT,
          embedding: [0.1, 0.2],
          projectMatches: [],
          projectAssignment: ASSIGNMENT,
          actionPlan,
        },
      ],
    });

    expect(output.actionPlans).toHaveLength(1);
    expect(output.actionPlans[0]).toMatchObject({
      destination: "new_project_candidate",
      topic: SEGMENT.topic,
      contextualText: SEGMENT.contextualText,
      projectName: "Snowflake Querying Strategy",
      projectId: null,
      confidence: 0.75,
    });
  });
});

describe("unassigned action plans", () => {
  const SEGMENT = {
    topic: "Alignment with Florida Team",
    sourceText:
      "but we still need to align with the Florida team so we don't end up with two different solutions solving the same problem.",
    contextualText:
      "However, we still need to align with the Florida team on the inventory app so we don't end up with two different solutions solving the same problem.",
  };

  const ASSIGNMENT = {
    originalText: SEGMENT.sourceText,
    destination: "unassigned" as const,
    projectId: null,
    projectName: null,
    matchBasis: "none" as const,
    confidence: 0.78,
    reason:
      "The segment concerns inventory app alignment across teams, not Florida load adjustment work represented by the candidate Project.",
  };

  it("includes unassigned segments in final actionPlans output", () => {
    const actionPlan = attachSegmentLineageToActionPlan(
      SEGMENT,
      buildUnassignedActionPlan(ASSIGNMENT)
    );

    const output = buildActiveNoteOutput({
      embeddedSegments: [
        {
          ...SEGMENT,
          embedding: [0.1, 0.2],
          projectMatches: [],
          projectAssignment: ASSIGNMENT,
          actionPlan,
        },
      ],
    });

    expect(output.actionPlans).toHaveLength(1);
    expect(output.actionPlans[0]).toMatchObject({
      destination: "unassigned",
      topic: SEGMENT.topic,
      projectId: null,
      projectName: null,
      confidence: 0.78,
    });
  });
});

describe("action plan segment coverage", () => {
  it("produces one action plan per segment", () => {
    const segments = [
      {
        topic: "Existing project",
        sourceText: "Plan the launch",
        contextualText: "Plan the launch",
        embedding: [0.1],
        projectMatches: [],
        projectAssignment: {
          originalText: "Plan the launch",
          destination: "existing_project" as const,
          projectId: "project-1",
          projectName: "Launch Plan",
          matchBasis: "project_scope" as const,
          confidence: 0.9,
          reason: "Matched.",
        },
        actionPlan: {
          originalText: "Plan the launch",
          projectId: "project-1",
          projectName: "Launch Plan",
          intent: "project_context" as const,
          action: {
            type: "create_note" as const,
            confidence: 0.8,
            reason: "Preserve context.",
            payload: {
              subject: "Launch update",
              content: "Plan the launch",
            },
          },
        },
      },
      {
        topic: "New project",
        sourceText: "Build a framework",
        contextualText: "Build a framework",
        embedding: [0.2],
        projectMatches: [],
        projectAssignment: {
          originalText: "Build a framework",
          destination: "new_project_candidate" as const,
          projectId: null,
          projectName: "Framework",
          matchBasis: "none" as const,
          confidence: 0.7,
          reason: "New effort.",
        },
        actionPlan: buildNewProjectCandidateActionPlan({
          originalText: "Build a framework",
          destination: "new_project_candidate",
          projectId: null,
          projectName: "Framework",
          matchBasis: "none",
          confidence: 0.7,
          reason: "New effort.",
        }),
      },
      {
        topic: "Unassigned",
        sourceText: "Random thought",
        contextualText: "Random thought",
        embedding: [0.3],
        projectMatches: [],
        projectAssignment: {
          originalText: "Random thought",
          destination: "unassigned" as const,
          projectId: null,
          projectName: null,
          matchBasis: "none" as const,
          confidence: 0.5,
          reason: "No project fit.",
        },
        actionPlan: buildUnassignedActionPlan({
          originalText: "Random thought",
          destination: "unassigned",
          projectId: null,
          projectName: null,
          matchBasis: "none",
          confidence: 0.5,
          reason: "No project fit.",
        }),
      },
    ];

    const output = buildActiveNoteOutput({ embeddedSegments: segments });

    expect(output.segments).toHaveLength(3);
    expect(output.actionPlans).toHaveLength(3);
  });

  it("throws when a segment is missing an action plan", () => {
    expect(() =>
      buildActiveNoteOutput({
        embeddedSegments: [
          {
            topic: "Missing plan",
            sourceText: "No action plan",
            contextualText: "No action plan",
            embedding: [0.1],
            projectMatches: [],
            projectAssignment: {
              originalText: "No action plan",
              destination: "unassigned",
              projectId: null,
              projectName: null,
              matchBasis: "none",
              confidence: 0.5,
              reason: "No fit.",
            },
          },
        ],
      })
    ).toThrow(/Missing action plan for segment/);
  });
});
