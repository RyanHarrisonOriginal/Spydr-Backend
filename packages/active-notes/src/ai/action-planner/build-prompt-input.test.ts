import { describe, expect, it } from "vitest";
import { buildSegmentActionPlannerUserInput } from "./build-prompt-input.js";
import type {
  ExistingProjectRoutedSegment,
  ProjectActionContext,
} from "../../domain/types/index.js";

const ROUTED_SEGMENT: ExistingProjectRoutedSegment = {
  originalText: ", but we still need to align with the Florida team.",
  destination: "existing_project",
  projectId: "project-1",
  projectName: "Southwest Inventory App",
  matchBasis: "direct_project_reference",
  confidence: 0.9,
  reason: "References the inventory app work.",
};

const PROJECT_CONTEXT: ProjectActionContext = {
  project: {
    id: "project-1",
    title: "Southwest Inventory App",
    description: null,
  },
  openTasks: [],
  recentTasks: [],
  recentNotes: [],
  recentDecisions: [],
  recentIdeas: [],
};

describe("buildSegmentActionPlannerUserInput", () => {
  it("includes contextualText and topic so titles can be fully qualified", () => {
    const payload = JSON.parse(
      buildSegmentActionPlannerUserInput({
        routedSegment: ROUTED_SEGMENT,
        projectContext: PROJECT_CONTEXT,
        topic: "Florida alignment",
        contextualText:
          "For the Southwest inventory app, we still need to align with the Florida team.",
      })
    ) as {
      segment: {
        originalText: string;
        contextualText: string;
        topic: string;
      };
    };

    expect(payload.segment.originalText).toBe(ROUTED_SEGMENT.originalText);
    expect(payload.segment.topic).toBe("Florida alignment");
    expect(payload.segment.contextualText).toBe(
      "For the Southwest inventory app, we still need to align with the Florida team."
    );
  });
});
