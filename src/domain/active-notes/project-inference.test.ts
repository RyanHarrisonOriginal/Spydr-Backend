import { describe, expect, it } from "vitest";
import { normalizeActiveNoteAIOutput } from "./normalize.js";
import {
  ACTIVE_NOTE_SYSTEM_PROMPT,
  ACTIVE_NOTE_MATCHING_PROMPT,
} from "./prompts/index.js";
import { ACTIVE_NOTE_PROMPT_VERSION } from "./types.js";
import type { ActiveNoteAIOutput, ActiveNoteProposal } from "./types.js";

/** Original failing note — no explicit app / "create a project" language. */
export const IMPLIED_COHESIVE_PROJECT_NOTE = `The Active Note analyze endpoint is working now, but the routing still feels too generic.

I want the system to first check whether the note belongs to an existing project, then look for any open task that the note is updating before it creates anything new.

I decided to keep this as one model call with modular prompt sections instead of splitting it into multiple agents.

Next, I need to improve the prompt so notes attach to the correct task or project instead of becoming generic note records.

Maybe later Active Notes could also update project summaries automatically.`;

const EXPLICIT_DOMAIN_NOTE = `As it relates to the Spydr app...

${IMPLIED_COHESIVE_PROJECT_NOTE}`;

function cohesiveNewProjectPackage(options?: {
  confidence?: number;
  projectExplicitlyStated?: boolean;
}): ActiveNoteAIOutput {
  const confidence = options?.confidence ?? 0.82;
  const projectExplicitlyStated = options?.projectExplicitlyStated ?? false;

  const segmentText = IMPLIED_COHESIVE_PROJECT_NOTE;
  const proposals: ActiveNoteProposal[] = [
    {
      ref: "project_1",
      operationType: "suggest_create",
      objectType: "project",
      parent: null,
      attachment: null,
      payload: {
        title: "Improve Active Note Routing",
        description:
          "Improve how Active Notes identify relevant projects and tasks, attach contextual notes, and organize downstream execution.",
      },
      explicitlyStated: projectExplicitlyStated,
      confidence,
      evidence: [
        "Active Note analyze endpoint is working now",
        "routing still feels too generic",
      ],
      reason:
        "Cohesive ongoing effort: progress, deficiency, decision, remaining work, and a future idea",
      segmentRef: "seg_1",
    },
    {
      ref: "task_1",
      operationType: "create",
      objectType: "task",
      parent: { projectId: null, projectRef: "project_1" },
      attachment: null,
      payload: { title: "Improve project and open-task routing" },
      explicitlyStated: true,
      confidence: 0.9,
      evidence: [
        "check whether the note belongs to an existing project",
        "look for any open task",
      ],
      reason: "Desired routing behavior stated as remaining work",
      segmentRef: "seg_1",
    },
    {
      ref: "task_2",
      operationType: "create",
      objectType: "task",
      parent: { projectId: null, projectRef: "project_1" },
      attachment: null,
      payload: {
        title: "Improve note attachment to the correct project or task",
      },
      explicitlyStated: true,
      confidence: 0.9,
      evidence: [
        "notes attach to the correct task or project instead of becoming generic note records",
      ],
      reason: "Concrete remaining implementation work",
      segmentRef: "seg_1",
    },
    {
      ref: "decision_1",
      operationType: "create",
      objectType: "decision",
      parent: { projectId: null, projectRef: "project_1" },
      attachment: null,
      payload: {
        title: "Use one model call with modular prompt sections",
        rationale:
          "I decided to keep this as one model call with modular prompt sections instead of splitting it into multiple agents.",
      },
      explicitlyStated: true,
      confidence: 0.93,
      evidence: [
        "I decided to keep this as one model call with modular prompt sections",
      ],
      reason: "Committed architectural decision",
      segmentRef: "seg_1",
    },
    {
      ref: "idea_1",
      operationType: "create",
      objectType: "idea",
      parent: { projectId: null, projectRef: "project_1" },
      attachment: null,
      payload: {
        title: "Automatically update project summaries from Active Notes",
      },
      explicitlyStated: true,
      confidence: 0.85,
      evidence: [
        "Maybe later Active Notes could also update project summaries automatically",
      ],
      reason: "Uncommitted future enhancement nested under the project",
      segmentRef: "seg_1",
    },
  ];

  return {
    routing: {
      destination: "new_project",
      projectId: null,
      relatedTaskId: null,
      reason:
        "The note describes an ongoing Active Note improvement effort with completed progress, a current routing problem, an architectural decision, concrete remaining work, and a future enhancement.",
      confidence,
    },
    impact: null,
    summary:
      "Organize the ongoing work to improve Active Note routing and execution-aware content handling.",
    segments: [
      {
        ref: "seg_1",
        text: segmentText,
        subject: "Active Note Routing",
      },
    ],
    routes: [
      {
        segmentRef: "seg_1",
        destination: "new_project",
        projectId: null,
        relatedTaskId: null,
        reason:
          "The note describes an ongoing Active Note improvement effort with completed progress, a current routing problem, an architectural decision, concrete remaining work, and a future enhancement.",
        confidence,
        impact: null,
      },
    ],
    proposals,
    candidateProjects: [],
    warnings: [],
  };
}

describe("Active Note project inference prompts", () => {
  it("includes SPLIT, MATCH, ACT stages and match confidence floor", () => {
    expect(ACTIVE_NOTE_PROMPT_VERSION).toBe("active-note-v8.0");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("## SPLIT");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("## MATCH");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("## ACT");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("TASK versus NOTE versus IDEA");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("check in with Todd Hanna");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("reach out to Boxmaker");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain(
      "Maybe later Spydr could automatically detect"
    );
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("independent subject segments");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("confidence >= 0.60");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).not.toContain("NEW PROJECT COHESION TEST");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).not.toContain("force-pick");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain(
      "Every segment must produce work"
    );
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain(
      "The subject must be shorter than the content"
    );
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("Segment intent test");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("NEVER emit a Project alone");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("journal entry headline");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("Naming: Project titles vs Note subjects");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("Vital Pak");
    expect(ACTIVE_NOTE_SYSTEM_PROMPT).toContain("ABL Automation");
    expect(ACTIVE_NOTE_MATCHING_PROMPT).toContain("projectCatalog");
    expect(ACTIVE_NOTE_MATCHING_PROMPT).toContain("new_project");
  });
});

describe("normalizeActiveNoteAIOutput project inference packages", () => {
  it("Test 1: accepts an implied cohesive new_project package without app-name language", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: IMPLIED_COHESIVE_PROJECT_NOTE,
      allowedProjectIds: new Set(),
      raw: cohesiveNewProjectPackage({
        confidence: 0.78,
        projectExplicitlyStated: false,
      }),
    });

    expect(result.routing.destination).toBe("new_project");
    const projects = result.proposals.filter((p) => p.objectType === "project");
    const tasks = result.proposals.filter((p) => p.objectType === "task");
    const decisions = result.proposals.filter((p) => p.objectType === "decision");
    const ideas = result.proposals.filter((p) => p.objectType === "idea");

    expect(projects).toHaveLength(1);
    expect(projects[0]?.explicitlyStated).toBe(false);
    expect(tasks.length).toBeGreaterThanOrEqual(1);
    expect(decisions).toHaveLength(1);
    expect(ideas).toHaveLength(1);

    for (const child of [...tasks, ...decisions, ...ideas]) {
      expect(child.parent?.projectRef).toBe("project_1");
      expect(child.parent?.projectId).toBeNull();
    }
  });

  it("Test 2: accepts the same package with explicit Spydr domain context", () => {
    const result = normalizeActiveNoteAIOutput({
      sourceText: EXPLICIT_DOMAIN_NOTE,
      allowedProjectIds: new Set(),
      raw: cohesiveNewProjectPackage({
        confidence: 0.9,
        projectExplicitlyStated: false,
      }),
    });

    expect(result.routing.destination).toBe("new_project");
    expect(
      result.proposals.filter((p) => p.objectType === "project")
    ).toHaveLength(1);
    expect(
      result.proposals.filter((p) => p.objectType === "task").length
    ).toBeGreaterThanOrEqual(1);
    expect(
      result.proposals.some((p) => p.objectType === "decision")
    ).toBe(true);
    expect(result.proposals.some((p) => p.objectType === "idea")).toBe(true);
    expect(result.routing.confidence).toBeGreaterThanOrEqual(0.78);
  });

  it("Test 3: single isolated task does not require inventing a new Project package", () => {
    const sourceText = "Improve the Active Note prompt tomorrow.";
    const result = normalizeActiveNoteAIOutput({
      sourceText,
      allowedProjectIds: new Set(["proj-active-note"]),
      raw: {
        routing: {
          destination: "existing_project",
          projectId: "proj-active-note",
          relatedTaskId: null,
          reason: "Isolated task under existing Active Note work",
          confidence: 0.88,
        },
        impact: { type: "new_task", reason: "Single concrete next step" },
        summary: "One task under the existing project.",
        segments: [
          {
            ref: "seg_1",
            text: sourceText,
            subject: "Active Note Prompt",
          },
        ],
        routes: [
          {
            segmentRef: "seg_1",
            destination: "existing_project",
            projectId: "proj-active-note",
            relatedTaskId: null,
            reason: "Isolated task under existing Active Note work",
            confidence: 0.88,
            impact: null,
          },
        ],
        proposals: [
          {
            ref: "task_1",
            operationType: "create",
            objectType: "task",
            parent: { projectId: "proj-active-note", projectRef: null },
            attachment: null,
            payload: { title: "Improve the Active Note prompt tomorrow" },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["Improve the Active Note prompt tomorrow"],
            reason: "Isolated explicit task",
            segmentRef: "seg_1",
          },
        ],
        candidateProjects: [
          {
            id: "proj-active-note",
            title: "Improve Active Note Routing",
            relevanceReason: "Matches Active Note work",
          },
        ],
        warnings: [],
      } satisfies ActiveNoteAIOutput,
    });

    expect(result.routing.destination).toBe("existing_project");
    expect(
      result.proposals.filter((p) => p.objectType === "project")
    ).toHaveLength(0);
    expect(result.proposals.map((p) => p.objectType)).toEqual(["task"]);
  });

  it("Test 4: weak idea routes as idea_only without a new Project", () => {
    const sourceText = "Maybe Active Notes could summarize projects.";
    const result = normalizeActiveNoteAIOutput({
      sourceText,
      allowedProjectIds: new Set(),
      raw: {
        routing: {
          destination: "idea_only",
          projectId: null,
          relatedTaskId: null,
          reason: "Uncommitted possibility without execution commitment",
          confidence: 0.84,
        },
        impact: null,
        summary: "Exploratory idea only.",
        segments: [
          {
            ref: "seg_1",
            text: sourceText,
            subject: "Active Notes",
          },
        ],
        routes: [
          {
            segmentRef: "seg_1",
            destination: "idea_only",
            projectId: null,
            relatedTaskId: null,
            reason: "Uncommitted possibility without execution commitment",
            confidence: 0.84,
            impact: null,
          },
        ],
        proposals: [
          {
            ref: "idea_1",
            operationType: "create",
            objectType: "idea",
            parent: null,
            attachment: null,
            payload: {
              title: "Active Notes could summarize projects",
            },
            explicitlyStated: true,
            confidence: 0.84,
            evidence: ["Maybe Active Notes could summarize projects"],
            reason: "Idle speculation; project selection may be required later",
            segmentRef: "seg_1",
          },
        ],
        candidateProjects: [],
        warnings: [],
      } satisfies ActiveNoteAIOutput,
    });

    expect(result.routing.destination).toBe("idea_only");
    expect(
      result.proposals.filter((p) => p.objectType === "project")
    ).toHaveLength(0);
    expect(result.proposals.map((p) => p.objectType)).toEqual(["idea"]);
  });

  it("Test 5: existing matching Project strips a redundant new Project proposal", () => {
    const sourceText = IMPLIED_COHESIVE_PROJECT_NOTE;
    const result = normalizeActiveNoteAIOutput({
      sourceText,
      allowedProjectIds: new Set(["proj-active-note"]),
      raw: {
        routing: {
          destination: "existing_project",
          projectId: "proj-active-note",
          relatedTaskId: null,
          reason: "Note belongs to the existing Active Note routing project",
          confidence: 0.91,
        },
        impact: {
          type: "mixed",
          reason: "Tasks, decision, and idea under the existing project",
        },
        summary: "Continue Active Note routing improvements under the existing project.",
        segments: [
          {
            ref: "seg_1",
            text: sourceText,
            subject: "Active Note Routing",
          },
        ],
        routes: [
          {
            segmentRef: "seg_1",
            destination: "existing_project",
            projectId: "proj-active-note",
            relatedTaskId: null,
            reason: "Note belongs to the existing Active Note routing project",
            confidence: 0.91,
            impact: null,
          },
        ],
        proposals: [
          {
            ref: "project_1",
            operationType: "suggest_create",
            objectType: "project",
            parent: null,
            attachment: null,
            payload: { title: "Improve Active Note Routing" },
            explicitlyStated: false,
            confidence: 0.7,
            evidence: ["Active Note analyze endpoint"],
            reason: "Should be dropped when routing to existing_project",
            segmentRef: "seg_1",
          },
          {
            ref: "task_1",
            operationType: "create",
            objectType: "task",
            parent: { projectId: "proj-active-note", projectRef: null },
            attachment: null,
            payload: { title: "Improve project and open-task routing" },
            explicitlyStated: true,
            confidence: 0.9,
            evidence: ["belongs to an existing project"],
            reason: "Remaining work under existing project",
            segmentRef: "seg_1",
          },
          {
            ref: "decision_1",
            operationType: "create",
            objectType: "decision",
            parent: { projectId: "proj-active-note", projectRef: null },
            attachment: null,
            payload: {
              title: "Use one model call with modular prompt sections",
            },
            explicitlyStated: true,
            confidence: 0.93,
            evidence: ["I decided to keep this as one model call"],
            reason: "Committed decision",
            segmentRef: "seg_1",
          },
        ],
        candidateProjects: [
          {
            id: "proj-active-note",
            title: "Improve Active Note Routing",
            relevanceReason: "Covers Active Note analyze/routing work",
          },
        ],
        warnings: [],
      } satisfies ActiveNoteAIOutput
    });

    expect(result.routing.destination).toBe("existing_project");
    expect(result.routing.projectId).toBe("proj-active-note");
    expect(
      result.proposals.filter((p) => p.objectType === "project")
    ).toHaveLength(0);
    expect(result.proposals.some((p) => p.objectType === "task")).toBe(true);
    expect(result.proposals.some((p) => p.objectType === "decision")).toBe(
      true
    );
  });
});
