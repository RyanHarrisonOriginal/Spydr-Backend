import { describe, expect, it } from "vitest";
import { normalizeActiveNoteAIOutput } from "./normalize.js";
import type { ActiveNoteAIOutput } from "./types.js";

function baseOutput(
  overrides: Partial<ActiveNoteAIOutput> = {}
): ActiveNoteAIOutput {
  return {
    routing: {
      destination: "existing_project",
      projectId: "proj-1",
      relatedTaskId: null,
      reason: "Matches existing project",
      confidence: 0.9,
    },
    impact: {
      type: "project_context",
      reason: "Useful project narrative",
    },
    summary: "Test summary",
    segments: [
      {
        ref: "seg_1",
        text: "Test segment text",
        subject: "Test Subject",
      },
    ],
    routes: [
      {
        segmentRef: "seg_1",
        destination: "existing_project",
        projectId: "proj-1",
        relatedTaskId: null,
        reason: "Matches existing project",
        confidence: 0.9,
        impact: null,
      },
    ],
    proposals: [],
    candidateProjects: [
      {
        id: "proj-1",
        title: "Muay Thai Development",
        relevanceReason: "Selected",
      },
    ],
    warnings: [],
    ...overrides,
  };
}

function withSourceSegment(
  sourceText: string,
  overrides: Partial<ActiveNoteAIOutput> = {},
  subject = "Test Subject"
): ActiveNoteAIOutput {
  const routing =
    overrides.routing ??
    ({
      destination: "existing_project",
      projectId: "proj-1",
      relatedTaskId: null,
      reason: "Matches existing project",
      confidence: 0.9,
    } as ActiveNoteAIOutput["routing"]);

  return baseOutput({
    segments: [{ ref: "seg_1", text: sourceText, subject }],
    routes: [
      {
        segmentRef: "seg_1",
        destination: routing.destination,
        projectId: routing.projectId ?? null,
        relatedTaskId: routing.relatedTaskId ?? null,
        reason: routing.reason,
        confidence: routing.confidence,
        impact: overrides.impact ?? null,
      },
    ],
    ...overrides,
    routing,
  });
}

describe("normalizeActiveNoteAIOutput routing", () => {
  it("keeps routing to an existing project with a valid projectId", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "The latest test showed the semantic model is too inflexible.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        proposals: [
          {
            ref: "note_1",
            operationType: "create",
            objectType: "note",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: { type: "project", id: "proj-1", ref: null },
            payload: {
              title: "Semantic model inflexibility",
              content: "The latest test showed the semantic model is too inflexible.",
            },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["semantic model is too inflexible"],
            reason: "Project-level observation",
          },
        ],
      }),
    });

    expect(result.routing.destination).toBe("existing_project");
    expect(result.routing.projectId).toBe("proj-1");
    expect(result.proposals[0]?.objectType).toBe("note");
  });

  it("keeps a cohesive new project plan with projectRef children", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText:
        "I want to build an eight-week lead-teep program. I need to drill jab-to-teep entries.",
      allowedProjectIds: new Set(["proj-other"]),
      raw: baseOutput({
        routing: {
          destination: "new_project",
          projectId: null,
          relatedTaskId: null,
          reason: "Distinct multi-step effort",
          confidence: 0.92,
        },
        impact: null,
        proposals: [
          {
            ref: "project_1",
            operationType: "suggest_create",
            objectType: "project",
            parent: null,
            attachment: null,
            payload: { title: "Eight-Week Lead Teep Development" },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["eight-week lead-teep program"],
            reason: "Multi-step outcome",
          },
          {
            ref: "task_1",
            operationType: "suggest_create",
            objectType: "task",
            parent: { projectId: null, projectRef: "project_1" },
            attachment: null,
            payload: { title: "Drill jab-to-teep entries" },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["drill jab-to-teep entries"],
            reason: "Directly stated task",
          },
        ],
      }),
    });

    expect(result.routing.destination).toBe("new_project");
    expect(result.proposals.map((p) => p.ref)).toEqual(["project_1", "task_1"]);
    expect(result.proposals[1]?.parent?.projectRef).toBe("project_1");
  });

  it("keeps existing task context attachment", () => {
    const sourceText = "Last night the taller guy caught every naked teep I threw.";
    const result = normalizeActiveNoteAIOutput({
      sourceText,
      allowedProjectIds: new Set(["proj-1"]),
      taskProjectMap: new Map([["task-teep", "proj-1"]]),
      raw: withSourceSegment(sourceText, {
        routing: {
          destination: "existing_project",
          projectId: "proj-1",
          relatedTaskId: "task-teep",
          reason: "Updates existing teep practice task",
          confidence: 0.91,
        },
        impact: {
          type: "task_context",
          reason: "Supports open teep task",
        },
        proposals: [
          {
            ref: "note_1",
            operationType: "attach_context",
            objectType: "note",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: { type: "task", id: "task-teep", ref: null },
            payload: {
              title: "Naked teeps caught by taller opponent",
              content: sourceText,
            },
            explicitlyStated: true,
            confidence: 0.93,
            evidence: ["caught every naked teep"],
            reason: "Progress note for existing task",
            segmentRef: "seg_1",
          },
        ],
      }, "Teep Sparring"),
    });

    expect(result.routing.relatedTaskId).toBe("task-teep");
    expect(result.proposals[0]?.operationType).toBe("create");
    expect(result.proposals[0]?.objectType).toBe("note");
    expect(result.proposals[0]?.attachment?.id).toBe("task-teep");
  });

  it("keeps a distinct new task under an existing project", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "We still need to build the proof of concept.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        impact: { type: "new_task", reason: "Distinct concrete action" },
        proposals: [
          {
            ref: "task_1",
            operationType: "create",
            objectType: "task",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: null,
            payload: { title: "Build the proof of concept" },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["build the proof of concept"],
            reason: "Explicit remaining work",
          },
        ],
      }),
    });

    expect(result.proposals[0]?.objectType).toBe("task");
    expect(result.proposals[0]?.suggestedProjectId).toBe("proj-1");
  });

  it("keeps a decision under an existing project", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText:
        "I decided to keep this as one model call with modular prompt sections.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        impact: { type: "decision", reason: "Committed choice" },
        proposals: [
          {
            ref: "decision_1",
            operationType: "create",
            objectType: "decision",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: null,
            payload: {
              title: "Keep Active Note as one model call",
              rationale: "one model call with modular prompt sections",
            },
            explicitlyStated: true,
            confidence: 0.92,
            evidence: ["I decided"],
            reason: "Committed decision",
          },
        ],
      }),
    });

    expect(result.proposals[0]?.objectType).toBe("decision");
  });

  it("keeps an idea under an existing project", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText:
        "Maybe later the system could update project summaries automatically.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        impact: { type: "idea", reason: "Uncommitted possibility" },
        proposals: [
          {
            ref: "idea_1",
            operationType: "create",
            objectType: "idea",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: null,
            payload: {
              title: "Automatic project summaries",
              description: "Maybe later update project summaries automatically.",
            },
            explicitlyStated: true,
            confidence: 0.85,
            evidence: ["Maybe later"],
            reason: "Uncommitted possibility",
          },
        ],
      }),
    });

    expect(result.proposals[0]?.objectType).toBe("idea");
  });

  it("remaps idea_only to new_project when the segment does not match the catalog", () => {
    const sourceText =
      "Maybe I could make an app that builds martial arts training plans.";
    const result = normalizeActiveNoteAIOutput({
      sourceText,
      allowedProjectIds: new Set(["proj-1"]),
      raw: withSourceSegment(sourceText, {
        routing: {
          destination: "idea_only",
          projectId: null,
          relatedTaskId: null,
          reason: "Uncommitted possibility without strong project fit",
          confidence: 0.8,
        },
        impact: null,
        proposals: [
          {
            ref: "idea_1",
            operationType: "create",
            objectType: "idea",
            parent: null,
            attachment: null,
            payload: {
              title: "Martial arts training plan app",
            },
            explicitlyStated: true,
            confidence: 0.8,
            evidence: ["Maybe I could make an app"],
            reason: "Project selection required",
            segmentRef: "seg_1",
          },
        ],
      }, "Training Plan App"),
    });

    expect(result.routing.destination).toBe("new_project");
    expect(result.proposals.some((p) => p.objectType === "idea")).toBe(false);
  });

  it("allows idea_only without a project when no candidates exist", () => {
    const sourceText =
      "Maybe I could make an app that builds martial arts training plans.";
    const result = normalizeActiveNoteAIOutput({
      sourceText,
      allowedProjectIds: new Set(),
      raw: withSourceSegment(sourceText, {
        routing: {
          destination: "idea_only",
          projectId: null,
          relatedTaskId: null,
          reason: "Uncommitted possibility without strong project fit",
          confidence: 0.8,
        },
        impact: null,
        candidateProjects: [],
        proposals: [
          {
            ref: "idea_1",
            operationType: "create",
            objectType: "idea",
            parent: null,
            attachment: null,
            payload: {
              title: "Martial arts training plan app",
            },
            explicitlyStated: true,
            confidence: 0.8,
            evidence: ["Maybe I could make an app"],
            reason: "Project selection required",
            segmentRef: "seg_1",
          },
        ],
      }, "Training Plan App"),
    });

    expect(result.routing.destination).toBe("idea_only");
    expect(result.proposals[0]?.objectType).toBe("idea");
    expect(result.proposals[0]?.parent).toBeNull();
  });

  it("normalizes multi-segment notes into per-segment routes and notes", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: [
        "Currently waiting for Quick books data to become available for Vital Pak",
        "",
        "ABL Automation has taken a back seat to other audits for Hilco and KPMG",
        "",
        "Kai Li will take over customer business review from Joe",
      ].join("\n"),
      allowedProjectIds: new Set(["proj-vital", "proj-abl", "proj-review"]),
      raw: baseOutput({
        routing: {
          destination: "existing_project",
          projectId: null,
          relatedTaskId: null,
          reason: "Multi-project note with 3 contexts",
          confidence: 0.85,
        },
        impact: null,
        segments: [
          {
            ref: "seg_1",
            text: "Currently waiting for Quick books data to become available for Vital Pak",
            subject: "Vital Pak",
          },
          {
            ref: "seg_2",
            text: "ABL Automation has taken a back seat to other audits for Hilco and KPMG",
            subject: "ABL Automation",
          },
          {
            ref: "seg_3",
            text: "Kai Li will take over customer business review from Joe",
            subject: "Customer business review",
          },
        ],
        routes: [
          {
            segmentRef: "seg_1",
            destination: "existing_project",
            projectId: "proj-vital",
            relatedTaskId: null,
            reason: "Vital Pak context",
            confidence: 0.9,
            impact: { type: "project_context", reason: "Status wait" },
          },
          {
            segmentRef: "seg_2",
            destination: "existing_project",
            projectId: "proj-abl",
            relatedTaskId: null,
            reason: "ABL Automation context",
            confidence: 0.88,
            impact: { type: "project_context", reason: "Priority shift" },
          },
          {
            segmentRef: "seg_3",
            destination: "existing_project",
            projectId: "proj-review",
            relatedTaskId: null,
            reason: "Customer business review handoff",
            confidence: 0.87,
            impact: { type: "project_context", reason: "Ownership change" },
          },
        ],
        candidateProjects: [
          {
            id: "proj-vital",
            title: "Vital Pak",
            relevanceReason: "Vital Pak",
          },
          {
            id: "proj-abl",
            title: "ABL Automation",
            relevanceReason: "ABL Automation",
          },
          {
            id: "proj-review",
            title: "Customer business review",
            relevanceReason: "Customer business review",
          },
        ],
        proposals: [
          {
            ref: "note_1",
            operationType: "create",
            objectType: "note",
            parent: { projectId: "proj-vital", projectRef: null },
            attachment: { type: "project", id: "proj-vital", ref: null },
            payload: {
              title: "Waiting for QuickBooks data",
              content:
                "Currently waiting for Quick books data to become available for Vital Pak",
            },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["waiting for Quick books data"],
            reason: "Vital Pak status",
            segmentRef: "seg_1",
          },
          {
            ref: "note_2",
            operationType: "create",
            objectType: "note",
            parent: { projectId: "proj-abl", projectRef: null },
            attachment: { type: "project", id: "proj-abl", ref: null },
            payload: {
              title: "ABL Automation deprioritized",
              content:
                "ABL Automation has taken a back seat to other audits for Hilco and KPMG",
            },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["ABL Automation has taken a back seat"],
            reason: "ABL status",
            segmentRef: "seg_2",
          },
          {
            ref: "note_3",
            operationType: "create",
            objectType: "note",
            parent: { projectId: "proj-review", projectRef: null },
            attachment: { type: "project", id: "proj-review", ref: null },
            payload: {
              title: "Kai Li takes over customer business review",
              content:
                "Kai Li will take over customer business review from Joe",
            },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["Kai Li will take over"],
            reason: "Handoff note",
            segmentRef: "seg_3",
          },
        ],
      }),
    });

    expect(result.segments).toHaveLength(3);
    expect(result.routes).toHaveLength(3);
    expect(result.routing.projectId).toBeNull();
    expect(result.routing.reason).toMatch(/3 contexts/i);
    expect(result.proposals).toHaveLength(3);
    expect(
      result.proposals.map((p) => p.segmentRef).sort()
    ).toEqual(["seg_1", "seg_2", "seg_3"]);
    expect(
      new Set(
        result.proposals.map((p) => p.parent?.projectId ?? p.suggestedProjectId)
      )
    ).toEqual(new Set(["proj-vital", "proj-abl", "proj-review"]));
  });

  it("removes notes missing an LLM title instead of inventing one", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText:
        "ABL Automation has taken a back seat to other audits for Hilco and KPMG",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        proposals: [
          {
            ref: "note_1",
            operationType: "create",
            objectType: "note",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: { type: "project", id: "proj-1", ref: null },
            payload: {
              content:
                "ABL Automation has taken a back seat to other audits for Hilco and KPMG",
            },
            explicitlyStated: true,
            confidence: 0.8,
            evidence: ["ABL Automation has taken a back seat"],
            reason: "Status observation",
            segmentRef: "seg_1",
          },
        ],
      }),
    });

    expect(result.proposals.some((p) => p.objectType === "note")).toBe(false);
    expect(result.warnings).toContain(
      "Removed note proposal note_1: missing LLM title"
    );
  });

  it("keeps LLM-provided note titles even when they look truncated", () => {
    const content =
      "ABL Automation has taken a back seat to other audits for Hilco and KPMG";
    const result = normalizeActiveNoteAIOutput({
      sourceText: content,
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        proposals: [
          {
            ref: "note_1",
            operationType: "create",
            objectType: "note",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: { type: "project", id: "proj-1", ref: null },
            payload: {
              title: "ABL Automation has taken a back",
              content,
            },
            explicitlyStated: true,
            confidence: 0.8,
            evidence: ["ABL Automation has taken a back seat"],
            reason: "Status observation",
            segmentRef: "seg_1",
          },
        ],
      }),
    });

    expect(result.proposals[0]?.payload.title).toBe(
      "ABL Automation has taken a back"
    );
  });

  it("attaches orphan notes to the routed existing project", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "Random prose with no useful routing.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        proposals: [
          {
            ref: "note_1",
            operationType: "create",
            objectType: "note",
            parent: null,
            attachment: null,
            payload: { title: "Random prose", content: "Random prose" },
            explicitlyStated: true,
            confidence: 0.5,
            evidence: ["Random prose"],
            reason: "Fallback note",
          },
        ],
      }),
    });

    expect(result.routing.destination).toBe("existing_project");
    expect(result.proposals[0]?.objectType).toBe("note");
    expect(result.proposals[0]?.parent?.projectId).toBe("proj-1");
    expect(result.proposals[0]?.attachment?.id).toBe("proj-1");
  });

  it("logs observational no_action results onto the most likely project", () => {
    const sourceText =
      "ABL Automation has taken a back seat to other audits for Hilco and KPMG";
    const result = normalizeActiveNoteAIOutput({
      sourceText,
      allowedProjectIds: new Set(["proj-abl"]),
      fallbackCandidateProjects: [
        {
          id: "proj-abl",
          title: "ABL Automation",
          relevanceReason: "Title overlap",
        },
      ],
      raw: withSourceSegment(sourceText, {
        routing: {
          destination: "no_action",
          projectId: null,
          relatedTaskId: null,
          reason: "No useful Spydr change",
          confidence: 0.8,
        },
        impact: null,
        candidateProjects: [
          {
            id: "proj-abl",
            title: "ABL Automation",
            relevanceReason: "Title overlap",
          },
        ],
        proposals: [
          {
            ref: "no_action_1",
            operationType: "no_action",
            objectType: "note",
            parent: null,
            attachment: null,
            payload: { title: "No action" },
            explicitlyStated: false,
            confidence: 1,
            evidence: [],
            reason: "No useful execution change detected",
            segmentRef: "seg_1",
          },
        ],
      }, "ABL Automation"),
    });

    expect(result.routing.destination).toBe("existing_project");
    expect(result.routing.projectId).toBe("proj-abl");
    expect(result.proposals.some((p) => p.objectType === "note")).toBe(false);
    expect(result.warnings.some((w) => w.includes("no actionable proposals"))).toBe(
      true
    );
  });

  it("preserves new_project when segment does not match the catalog", () => {
    const sourceText = "Random observational note about something unrelated.";
    const result = normalizeActiveNoteAIOutput({
      sourceText,
      allowedProjectIds: new Set(["proj-abl"]),
      raw: withSourceSegment(sourceText, {
        routing: {
          destination: "new_project",
          projectId: null,
          relatedTaskId: null,
          reason: "Distinct subject",
          confidence: 0.6,
        },
        impact: null,
        candidateProjects: [
          {
            id: "proj-abl",
            title: "ABL Automation",
            relevanceReason: "Title overlap",
          },
        ],
        proposals: [
          {
            ref: "project_1",
            operationType: "suggest_create",
            objectType: "project",
            parent: null,
            attachment: null,
            payload: { title: "Unrelated subject" },
            explicitlyStated: false,
            confidence: 0.6,
            evidence: ["Random observational note"],
            reason: "New container",
            segmentRef: "seg_1",
          },
        ],
      }, "Unrelated Subject"),
    });

    expect(result.routing.destination).toBe("new_project");
    expect(result.proposals.some((p) => p.objectType === "project")).toBe(true);
    expect(result.proposals.some((p) => p.objectType === "note")).toBe(false);
    expect(result.warnings).toContain(
      "new_project segment seg_1 is missing a Note proposal with an LLM title"
    );
  });

  it("rejects vague person proposals", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "A big guy at the gym kept catching my teep.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        proposals: [
          {
            ref: "person_1",
            operationType: "create",
            objectType: "person",
            parent: null,
            attachment: null,
            payload: { name: "a big guy" },
            explicitlyStated: true,
            confidence: 0.4,
            evidence: ["A big guy"],
            reason: "Mentioned person",
          },
          {
            ref: "note_1",
            operationType: "create",
            objectType: "note",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: { type: "project", id: "proj-1", ref: null },
            payload: {
              title: "Teep caught during gym sparring",
              content: "A big guy at the gym kept catching my teep.",
            },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["kept catching my teep"],
            reason: "Useful project observation",
          },
        ],
      }),
    });

    expect(result.proposals.some((p) => p.objectType === "person")).toBe(false);
    expect(result.proposals.some((p) => p.objectType === "note")).toBe(true);
  });

  it("rematches invalid routing projectId when the segment matches the catalog", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "Practice teep setups for Muay Thai Development.",
      allowedProjectIds: new Set(["proj-1"]),
      taskProjectMap: new Map([["task-1", "proj-1"]]),
      raw: baseOutput({
        routing: {
          destination: "existing_project",
          projectId: "not-allowed",
          relatedTaskId: "missing-task",
          reason: "Bad ids",
          confidence: 0.7,
        },
        proposals: [
          {
            ref: "task_1",
            operationType: "create",
            objectType: "task",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: null,
            payload: { title: "Practice teep setups" },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["Practice teep setups"],
            reason: "Explicit action",
          },
        ],
      }),
    });

    expect(result.routing.destination).toBe("existing_project");
    expect(result.routing.projectId).toBe("proj-1");
    expect(result.routing.relatedTaskId).toBeNull();
    expect(result.proposals[0]?.objectType).toBe("task");
  });

  it("removes proposals inconsistent with existing_project routing", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "Track sparring notes in Muay Thai Development.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        proposals: [
          {
            ref: "project_1",
            operationType: "suggest_create",
            objectType: "project",
            parent: null,
            attachment: null,
            payload: { title: "Another project" },
            explicitlyStated: false,
            confidence: 0.5,
            evidence: ["Track sparring notes"],
            reason: "Should not create project",
          },
          {
            ref: "note_1",
            operationType: "create",
            objectType: "note",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: { type: "project", id: "proj-1", ref: null },
            payload: {
              title: "Sparring notes",
              content: "Track sparring notes in Muay Thai Development.",
            },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["Track sparring notes"],
            reason: "Project narrative",
          },
        ],
      }),
    });

    expect(result.proposals.some((p) => p.objectType === "project")).toBe(false);
    expect(result.proposals.some((p) => p.objectType === "note")).toBe(true);
  });

  it("fills task parent from routing when projectId/projectRef omitted", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "Build the proof of concept.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        proposals: [
          {
            ref: "task_1",
            operationType: "create",
            objectType: "task",
            parent: null,
            attachment: null,
            payload: { title: "Build the proof of concept" },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["Build the proof of concept"],
            reason: "Missing parent",
          },
        ],
      }),
    });

    // Falls back onto routing.projectId when existing_project
    expect(result.proposals[0]?.parent?.projectId).toBe("proj-1");
  });

  it("rejects task when routing cannot supply a project parent", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "Build the proof of concept.",
      allowedProjectIds: new Set(),
      raw: baseOutput({
        routing: {
          destination: "idea_only",
          projectId: null,
          relatedTaskId: null,
          reason: "No project",
          confidence: 0.5,
        },
        impact: null,
        candidateProjects: [],
        proposals: [
          {
            ref: "task_1",
            operationType: "create",
            objectType: "task",
            parent: null,
            attachment: null,
            payload: { title: "Build the proof of concept" },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["Build the proof of concept"],
            reason: "Orphan task",
          },
        ],
      }),
    });

    expect(result.proposals.some((p) => p.objectType === "task")).toBe(false);
    expect(result.proposals.some((p) => p.objectType === "note")).toBe(false);
    expect(result.warnings.some((w) => w.includes("no actionable proposals"))).toBe(
      true
    );
  });

  it("does not synthesize untitled proposals when new_project lacks a Project proposal", () => {
    const sourceText = "I want to build a big multi-step program.";
    const result = normalizeActiveNoteAIOutput({
      sourceText,
      allowedProjectIds: new Set(["proj-1"]),
      raw: withSourceSegment(sourceText, {
        routing: {
          destination: "new_project",
          projectId: null,
          relatedTaskId: null,
          reason: "New effort",
          confidence: 0.8,
        },
        impact: null,
        proposals: [
          {
            ref: "task_1",
            operationType: "suggest_create",
            objectType: "task",
            parent: { projectId: null, projectRef: "project_missing" },
            attachment: null,
            payload: { title: "Do something" },
            explicitlyStated: true,
            confidence: 0.7,
            evidence: ["build a big multi-step program"],
            reason: "Orphan task",
            segmentRef: "seg_1",
          },
        ],
      }, "Multi-step Program"),
    });

    expect(result.proposals.some((p) => p.objectType === "project")).toBe(false);
    expect(result.proposals.some((p) => p.objectType === "note")).toBe(false);
    expect(result.warnings).toContain(
      "new_project routing for seg_1 had no Project proposal with an LLM title"
    );
  });

  it("removes invented due dates and priorities", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "Practice teep setups before sparring.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        proposals: [
          {
            ref: "task_1",
            operationType: "create",
            objectType: "task",
            parent: { projectId: "proj-1", projectRef: null },
            attachment: null,
            payload: {
              title: "Practice teep setups before sparring",
              dueDate: "2026-08-10",
              priority: "high",
            },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["Practice teep setups before sparring"],
            reason: "Explicit action",
          },
        ],
      }),
    });

    expect(result.proposals[0]?.payload.dueDate).toBeNull();
    expect(result.proposals[0]?.payload.priority).toBeUndefined();
  });
});
