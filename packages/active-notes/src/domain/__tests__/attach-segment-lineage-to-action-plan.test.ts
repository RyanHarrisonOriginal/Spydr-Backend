import { describe, expect, it } from "vitest";
import {
  attachSegmentLineageToActionPlan,
  assertSegmentContextualTextMatches,
} from "../attach-segment-lineage-to-action-plan.js";
import { buildActiveNoteOutput } from "../build-active-note-output.js";
import type { SegmentActionPlan } from "../types/index.js";

const SEGMENT = {
  topic: "Amy meeting",
  sourceText: "Met with Amy today.",
  contextualText: "Met with Amy today about the Commercial Scorecard rollout.",
};

const ACTION_PLAN: SegmentActionPlan = {
  originalText: SEGMENT.sourceText,
  projectId: "project-1",
  projectName: "Commercial Scorecard v2",
  intent: "progress_update",
  action: {
    type: "create_note",
    confidence: 0.9,
    reason: "Preserve meeting context.",
    payload: {
      subject: "Amy meeting",
      content: SEGMENT.sourceText,
    },
  },
};

describe("attachSegmentLineageToActionPlan", () => {
  it("copies topic and contextualText from the segmentation segment", () => {
    expect(
      attachSegmentLineageToActionPlan(SEGMENT, ACTION_PLAN)
    ).toMatchObject({
      originalText: SEGMENT.sourceText,
      topic: SEGMENT.topic,
      contextualText: SEGMENT.contextualText,
    });
  });

  it("rejects action plans whose originalText does not match sourceText", () => {
    expect(() =>
      attachSegmentLineageToActionPlan(SEGMENT, {
        ...ACTION_PLAN,
        originalText: "Different text",
      })
    ).toThrow(/does not match segment sourceText/);
  });
});

describe("buildActiveNoteOutput contextualText lineage", () => {
  it("preserves segmentation topic and contextualText on segments and action plans", () => {
    const output = buildActiveNoteOutput({
      embeddedSegments: [
        {
          ...SEGMENT,
          embedding: [0.1, 0.2],
          projectMatches: [],
          projectAssignment: {
            originalText: SEGMENT.sourceText,
            destination: "existing_project",
            projectId: "project-1",
            projectName: "Commercial Scorecard v2",
            matchBasis: "project_scope",
            confidence: 0.9,
            reason: "Matched project.",
          },
          actionPlan: attachSegmentLineageToActionPlan(SEGMENT, ACTION_PLAN),
        },
      ],
    });

    expect(output.segments[0]?.topic).toBe(SEGMENT.topic);
    expect(output.segments[0]?.contextualText).toBe(SEGMENT.contextualText);
    expect(output.actionPlans[0]?.topic).toBe(SEGMENT.topic);
    expect(output.actionPlans[0]?.contextualText).toBe(SEGMENT.contextualText);
  });

  it("rejects action plans whose contextualText diverged from the segment", () => {
    expect(() =>
      assertSegmentContextualTextMatches(SEGMENT, {
        contextualText: "Different contextual text",
      })
    ).toThrow(/does not match segment contextualText/);
  });

  it("rejects action plans whose topic diverged from the segment", () => {
    expect(() =>
      assertSegmentContextualTextMatches(SEGMENT, {
        topic: "Different topic",
      })
    ).toThrow(/does not match segment topic/);
  });
});
