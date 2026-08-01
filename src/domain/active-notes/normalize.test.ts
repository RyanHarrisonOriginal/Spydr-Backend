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
    const result = normalizeActiveNoteAIOutput({
      sourceText: "Last night the taller guy caught every naked teep I threw.",
      allowedProjectIds: new Set(["proj-1"]),
      taskProjectMap: new Map([["task-teep", "proj-1"]]),
      raw: baseOutput({
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
              content: "Last night the taller guy caught every naked teep I threw.",
            },
            explicitlyStated: true,
            confidence: 0.93,
            evidence: ["caught every naked teep"],
            reason: "Progress note for existing task",
          },
        ],
      }),
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

  it("allows idea_only without forcing a project", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText:
        "Maybe I could make an app that builds martial arts training plans.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
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
          },
        ],
      }),
    });

    expect(result.routing.destination).toBe("idea_only");
    expect(result.proposals[0]?.objectType).toBe("idea");
    expect(result.proposals[0]?.parent).toBeNull();
  });

  it("rejects a generic note fallback without attachment or parent", () => {
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

    expect(
      result.proposals.every(
        (p) => p.objectType !== "note" || p.operationType === "no_action"
      )
    ).toBe(true);
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

  it("removes invalid projectId and relatedTaskId from routing", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "Practice teep setups.",
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

    expect(result.routing.destination).toBe("no_action");
    expect(result.routing.projectId).toBeNull();
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
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
        routing: {
          destination: "idea_only",
          projectId: null,
          relatedTaskId: null,
          reason: "No project",
          confidence: 0.5,
        },
        impact: null,
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
  });

  it("downgrades new_project routing with no Project proposal", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: "I want to build a big multi-step program.",
      allowedProjectIds: new Set(["proj-1"]),
      raw: baseOutput({
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
          },
        ],
      }),
    });

    expect(result.routing.destination).toBe("no_action");
    expect(result.proposals[0]?.operationType).toBe("no_action");
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
