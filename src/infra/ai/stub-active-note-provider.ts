import type {
  ActiveNoteAIInput,
  ActiveNoteAIOutput,
  ActiveNoteAIProvider,
  ActiveNoteCandidateProject,
  ActiveNoteProposal,
} from "../../domain/active-notes/index.js";

type StubOutput = Omit<ActiveNoteAIOutput, "segments" | "routes"> &
  Partial<Pick<ActiveNoteAIOutput, "segments" | "routes">>;

function finalizeStub(output: StubOutput): ActiveNoteAIOutput {
  return {
    ...output,
    segments: output.segments ?? [],
    routes: output.routes ?? [],
  };
}

function delay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function preferredProjectId(input: ActiveNoteAIInput): string | null {
  return (
    input.selectedProject?.id ??
    input.candidateProjects[0]?.id ??
    null
  );
}

function preferredRelatedTaskId(input: ActiveNoteAIInput): string | null {
  const context =
    input.selectedProject ?? input.candidateProjectContexts[0] ?? null;
  return context?.openTasks[0]?.id ?? null;
}

function candidateProjects(
  input: ActiveNoteAIInput
): ActiveNoteCandidateProject[] {
  if (input.candidateProjects.length > 0) {
    return input.candidateProjects;
  }
  if (input.selectedProject) {
    return [
      {
        id: input.selectedProject.id,
        title: input.selectedProject.title,
        relevanceReason: "Selected project for this note",
      },
    ];
  }
  return [];
}

function baseWarnings(): string[] {
  return ["Using stub Active Note AI provider (no OPENAI_API_KEY)."];
}

function observationOutput(input: ActiveNoteAIInput): StubOutput {
  const projectId = preferredProjectId(input);
  const relatedTaskId = preferredRelatedTaskId(input);
  const proposals: ActiveNoteProposal[] = [
    {
      ref: "note_1",
      operationType: "attach_context",
      objectType: "note",
      parent: { projectId, projectRef: null },
      attachment: relatedTaskId
        ? { type: "task", id: relatedTaskId, ref: null }
        : projectId
          ? { type: "project", id: projectId, ref: null }
          : null,
      payload: {
        title: "Difficulty landing teeps against a larger opponent",
        content:
          "During sparring, I had difficulty landing a teep against a larger opponent.",
      },
      explicitlyStated: true,
      confidence: 0.94,
      evidence: ["had problems landing a teep"],
      reason: "Observation updates existing teep practice context",
    },
  ];

  if (!relatedTaskId && projectId) {
    proposals.push({
      ref: "task_1",
      operationType: "suggest_create",
      objectType: "task",
      parent: { projectId, projectRef: null },
      attachment: null,
      payload: {
        title: "Practice teep setups against larger opponents",
        description:
          "Optional follow-up drill inferred from the sparring observation.",
      },
      explicitlyStated: false,
      confidence: 0.68,
      evidence: ["had problems landing a teep"],
      reason: "Implied next drill if no matching open task exists",
    });
  }

  if (!projectId) {
    return {
      routing: {
        destination: "new_project",
        projectId: null,
        relatedTaskId: null,
        reason: "No existing project available; log observation under a new project",
        confidence: 0.78,
      },
      impact: null,
      summary:
        "Stub analysis: sparring observation about teep difficulty. No person created from “big guy”.",
      proposals: [
        {
          ref: "project_1",
          operationType: "suggest_create",
          objectType: "project",
          parent: null,
          attachment: null,
          payload: {
            title: "Teep sparring development",
            description:
              "Work on landing teeps more reliably during sparring.",
          },
          explicitlyStated: false,
          confidence: 0.78,
          evidence: ["had problems landing a teep"],
          reason: "Container for logging the sparring observation",
        },
        {
          ref: "note_1",
          operationType: "create",
          objectType: "note",
          parent: { projectId: null, projectRef: "project_1" },
          attachment: { type: "project", id: null, ref: "project_1" },
          payload: {
            title: "Difficulty landing teeps against a larger opponent",
            content:
              "During sparring, I had difficulty landing a teep against a larger opponent.",
          },
          explicitlyStated: true,
          confidence: 0.94,
          evidence: ["had problems landing a teep"],
          reason: "Preserve the Active Note under the new project",
        },
      ],
      candidateProjects: candidateProjects(input),
      warnings: baseWarnings(),
    };
  }

  return {
    routing: {
      destination: "existing_project",
      projectId,
      relatedTaskId,
      reason: "Matches existing training project and teep practice context",
      confidence: 0.9,
    },
    impact: {
      type: relatedTaskId ? "task_context" : "mixed",
      reason: relatedTaskId
        ? "Note supports an open teep-related task"
        : "Observation with optional follow-up task",
    },
    summary:
      "Stub analysis: sparring observation about teep difficulty. No person created from “big guy”.",
    proposals,
    candidateProjects: candidateProjects(input),
    warnings: baseWarnings(),
  };
}

function explicitTaskOutput(input: ActiveNoteAIInput): StubOutput {
  const projectId = preferredProjectId(input);
  if (!projectId) {
    return {
      routing: {
        destination: "new_project",
        projectId: null,
        relatedTaskId: null,
        reason:
          "No existing project clearly fits; create a container for this action",
        confidence: 0.9,
      },
      impact: null,
      summary:
        "Stub analysis: unmatched explicit action → new project + task.",
      proposals: [
        {
          ref: "project_1",
          operationType: "suggest_create",
          objectType: "project",
          parent: null,
          attachment: null,
          payload: {
            title: "Teep Setup Practice",
            description: "Practice teep setups before sparring.",
          },
          explicitlyStated: false,
          confidence: 0.82,
          evidence: ["Practice teep setups"],
          reason: "Unmatched work topic needs a project container",
        },
        {
          ref: "task_1",
          operationType: "create",
          objectType: "task",
          parent: { projectId: null, projectRef: "project_1" },
          attachment: null,
          payload: {
            title: "Practice teep setups before sparring",
            description: "Explicit action from the note.",
          },
          explicitlyStated: true,
          confidence: 0.93,
          evidence: ["Practice teep setups"],
          reason: "Explicit action under the new project",
        },
      ],
      candidateProjects: candidateProjects(input),
      warnings: baseWarnings(),
    };
  }

  return {
    routing: {
      destination: "existing_project",
      projectId,
      relatedTaskId: null,
      reason: "Explicit practice action under the selected project",
      confidence: 0.93,
    },
    impact: {
      type: "new_task",
      reason: "Concrete next-step action stated in the note",
    },
    summary: "Stub analysis: explicit practice task detected.",
    proposals: [
      {
        ref: "task_1",
        operationType: "create",
        objectType: "task",
        parent: { projectId, projectRef: null },
        attachment: null,
        payload: {
          title: "Practice teep setups before sparring",
          description: "Explicit action from the note.",
        },
        explicitlyStated: true,
        confidence: 0.93,
        evidence: ["Practice teep setups"],
        reason: "Explicit action commitment",
      },
    ],
    candidateProjects: candidateProjects(input),
    warnings: baseWarnings(),
  };
}

function decisionOutput(input: ActiveNoteAIInput): StubOutput {
  const projectId = preferredProjectId(input);
  if (!projectId) {
    return {
      routing: {
        destination: "new_project",
        projectId: null,
        relatedTaskId: null,
        reason: "No existing project available; host decision under a new project",
        confidence: 0.8,
      },
      impact: null,
      summary: "Stub analysis: decision detected.",
      proposals: [
        {
          ref: "project_1",
          operationType: "suggest_create",
          objectType: "project",
          parent: null,
          attachment: null,
          payload: {
            title: "Active Notes AI approach",
            description: "Decide and track how Active Notes uses AI.",
          },
          explicitlyStated: false,
          confidence: 0.8,
          evidence: ["I decided"],
          reason: "Container for the decision",
        },
        {
          ref: "decision_1",
          operationType: "create",
          objectType: "decision",
          parent: { projectId: null, projectRef: "project_1" },
          attachment: null,
          payload: {
            title: "Use Claude for Active Notes",
            rationale: "I decided to use Claude for Active Notes.",
          },
          explicitlyStated: true,
          confidence: 0.91,
          evidence: ["I decided"],
          reason: "Committed decision stated in the note",
        },
        {
          ref: "note_1",
          operationType: "create",
          objectType: "note",
          parent: { projectId: null, projectRef: "project_1" },
          attachment: { type: "project", id: null, ref: "project_1" },
          payload: {
            title: "Decision context",
            content: input.content.trim(),
          },
          explicitlyStated: true,
          confidence: 0.8,
          evidence: ["I decided"],
          reason: "Preserve the Active Note under the new project",
        },
      ],
      candidateProjects: candidateProjects(input),
      warnings: baseWarnings(),
    };
  }

  return {
    routing: {
      destination: "existing_project",
      projectId,
      relatedTaskId: null,
      reason: "Committed choice affecting project execution",
      confidence: 0.91,
    },
    impact: {
      type: "decision",
      reason: "User stated a decided approach",
    },
    summary: "Stub analysis: decision detected.",
    proposals: [
      {
        ref: "decision_1",
        operationType: "create",
        objectType: "decision",
        parent: { projectId, projectRef: null },
        attachment: null,
        payload: {
          title: "Use Claude for Active Notes",
          rationale: "I decided to use Claude for Active Notes.",
        },
        explicitlyStated: true,
        confidence: 0.91,
        evidence: ["I decided"],
        reason: "Committed decision stated in the note",
      },
    ],
    candidateProjects: candidateProjects(input),
    warnings: baseWarnings(),
  };
}

function ideaOutput(input: ActiveNoteAIInput): StubOutput {
  const projectId = preferredProjectId(input);
  return {
    routing: {
      destination: projectId ? "existing_project" : "idea_only",
      projectId,
      relatedTaskId: null,
      reason: projectId
        ? "Uncommitted possibility under an existing project"
        : "Uncommitted possibility without a strong project match",
      confidence: 0.86,
    },
    impact: projectId
      ? {
          type: "idea",
          reason: "Exploratory possibility, not a committed project",
        }
      : null,
    summary: "Stub analysis: exploratory idea detected.",
    proposals: [
      {
        ref: "idea_1",
        operationType: "create",
        objectType: "idea",
        parent: projectId ? { projectId, projectRef: null } : null,
        attachment: null,
        payload: {
          title: "Weekly Active Note summaries",
          description: "Maybe Active Notes could produce weekly summaries.",
        },
        explicitlyStated: true,
        confidence: 0.86,
        evidence: ["Maybe Active Notes could produce weekly summaries"],
        reason: "Uncommitted possibility; not a new project",
      },
    ],
    candidateProjects: candidateProjects(input),
    warnings: baseWarnings(),
  };
}

function namedPersonOutput(input: ActiveNoteAIInput): StubOutput {
  const projectId = preferredProjectId(input);
  if (!projectId) {
    return {
      routing: {
        destination: "new_project",
        projectId: null,
        relatedTaskId: null,
        reason:
          "No existing project clearly fits; create a container then the named ask",
        confidence: 0.9,
      },
      impact: null,
      summary:
        "Stub analysis: unmatched note → new project, then person + task.",
      proposals: [
        {
          ref: "project_1",
          operationType: "suggest_create",
          objectType: "project",
          parent: null,
          attachment: null,
          payload: {
            title: "Lead Teep Review",
            description: "Work involving Coach Marcus and lead teep review.",
          },
          explicitlyStated: false,
          confidence: 0.84,
          evidence: ["Coach Marcus", "lead teep"],
          reason: "Unmatched work topic needs a project container",
        },
        {
          ref: "person_1",
          operationType: "create",
          objectType: "person",
          parent: null,
          attachment: null,
          payload: { name: "Coach Marcus" },
          explicitlyStated: true,
          confidence: 0.9,
          evidence: ["Coach Marcus"],
          reason: "Specifically identified individual",
        },
        {
          ref: "task_1",
          operationType: "create",
          objectType: "task",
          parent: { projectId: null, projectRef: "project_1" },
          attachment: null,
          payload: {
            title: "Ask Coach Marcus to review my lead teep",
          },
          explicitlyStated: true,
          confidence: 0.92,
          evidence: ["Ask Coach Marcus to review my lead teep"],
          reason: "Explicit request/action under the new project",
        },
      ],
      candidateProjects: candidateProjects(input),
      warnings: baseWarnings(),
    };
  }

  return {
    routing: {
      destination: "existing_project",
      projectId,
      relatedTaskId: null,
      reason: "Named person plus explicit ask under project context",
      confidence: 0.9,
    },
    impact: {
      type: "new_task",
      reason: "Explicit request to Coach Marcus",
    },
    summary: "Stub analysis: named person and task detected.",
    proposals: [
      {
        ref: "person_1",
        operationType: "create",
        objectType: "person",
        parent: null,
        attachment: null,
        payload: {
          name: "Coach Marcus",
        },
        explicitlyStated: true,
        confidence: 0.9,
        evidence: ["Coach Marcus"],
        reason: "Specifically identified individual",
      },
      {
        ref: "task_1",
        operationType: "create",
        objectType: "task",
        parent: { projectId, projectRef: null },
        attachment: null,
        payload: {
          title: "Ask Coach Marcus to review my lead teep",
        },
        explicitlyStated: true,
        confidence: 0.92,
        evidence: ["Ask Coach Marcus to review my lead teep"],
        reason: "Explicit request/action",
      },
    ],
    candidateProjects: candidateProjects(input),
    warnings: baseWarnings(),
  };
}

function newProjectOutput(input: ActiveNoteAIInput): StubOutput {
  return {
    routing: {
      destination: "new_project",
      projectId: null,
      relatedTaskId: null,
      reason:
        "No existing project clearly fits; create a project container for this work",
      confidence: 0.9,
    },
    impact: null,
    summary:
      "Stub analysis: new project with only the downstream objects the note supports.",
    proposals: [
      {
        ref: "project_1",
        operationType: "suggest_create",
        objectType: "project",
        parent: null,
        attachment: null,
        payload: {
          title: "Eight-Week Lead Teep Development",
          description:
            "Build an eight-week plan to make the lead teep reliable.",
        },
        explicitlyStated: true,
        confidence: 0.9,
        evidence: ["eight-week", "lead teep"],
        reason: "Unmatched work topic needs a project container",
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
        evidence: ["jab-to-teep"],
        reason: "Directly stated initial task",
      },
      {
        ref: "task_2",
        operationType: "suggest_create",
        objectType: "task",
        parent: { projectId: null, projectRef: "project_1" },
        attachment: null,
        payload: { title: "Ask Coach Marcus to review lead teep form" },
        explicitlyStated: true,
        confidence: 0.9,
        evidence: ["Coach Marcus"],
        reason: "Directly stated coaching ask",
      },
      {
        ref: "task_3",
        operationType: "suggest_create",
        objectType: "task",
        parent: { projectId: null, projectRef: "project_1" },
        attachment: null,
        payload: { title: "Track lead-teep performance during sparring" },
        explicitlyStated: true,
        confidence: 0.88,
        evidence: ["track", "sparring"],
        reason: "Directly stated tracking work",
      },
      {
        ref: "person_1",
        operationType: "create",
        objectType: "person",
        parent: null,
        attachment: null,
        payload: { name: "Coach Marcus" },
        explicitlyStated: true,
        confidence: 0.9,
        evidence: ["Coach Marcus"],
        reason: "Named coach involved in the plan",
      },
    ],
    candidateProjects: candidateProjects(input),
    warnings: baseWarnings(),
  };
}

function fallbackOutput(input: ActiveNoteAIInput): StubOutput {
  const projectId = preferredProjectId(input);
  const trimmed = input.content.trim();
  const snippet = trimmed.slice(0, 80);
  if (!projectId) {
    if (!trimmed) {
      return {
        routing: {
          destination: "no_action",
          projectId: null,
          relatedTaskId: null,
          reason: "Empty note",
          confidence: 1,
        },
        impact: null,
        summary: "Stub analysis: empty note.",
        proposals: [
          {
            ref: "no_action_1",
            operationType: "no_action",
            objectType: "note",
            parent: null,
            attachment: null,
            payload: {
              title: "No action",
              description: "No useful Spydr change detected.",
            },
            explicitlyStated: false,
            confidence: 1,
            evidence: [],
            reason: "Empty input",
          },
        ],
        candidateProjects: candidateProjects(input),
        warnings: baseWarnings(),
      };
    }

    const title =
      trimmed.length > 60 ? `${trimmed.slice(0, 57).trim()}…` : trimmed;
    return {
      routing: {
        destination: "new_project",
        projectId: null,
        relatedTaskId: null,
        reason:
          "No existing project candidates available; log note under a new project",
        confidence: 0.78,
      },
      impact: null,
      summary: `Stub analysis: unmatched note → new project for “${snippet}${trimmed.length > 80 ? "…" : ""}”`,
      proposals: [
        {
          ref: "project_1",
          operationType: "suggest_create",
          objectType: "project",
          parent: null,
          attachment: null,
          payload: {
            title,
            description: trimmed,
          },
          explicitlyStated: false,
          confidence: 0.78,
          evidence: [snippet || trimmed],
          reason: "Unmatched note needs a project home",
        },
        {
          ref: "note_1",
          operationType: "create",
          objectType: "note",
          parent: { projectId: null, projectRef: "project_1" },
          attachment: { type: "project", id: null, ref: "project_1" },
          payload: {
            title,
            content: trimmed,
          },
          explicitlyStated: true,
          confidence: 0.8,
          evidence: [snippet || trimmed],
          reason: "Preserve the Active Note under the new project",
        },
      ],
      candidateProjects: candidateProjects(input),
      warnings: baseWarnings(),
    };
  }

  return {
    routing: {
      destination: "existing_project",
      projectId,
      relatedTaskId: null,
      reason: "Preserve useful project narrative without inventing work",
      confidence: 0.7,
    },
    impact: {
      type: "project_context",
      reason: "Narrative context for the selected project",
    },
    summary: `Stub analysis for: “${snippet}${input.content.trim().length > 80 ? "…" : ""}”`,
    proposals: [
      {
        ref: "note_1",
        operationType: "attach_context",
        objectType: "note",
        parent: { projectId, projectRef: null },
        attachment: { type: "project", id: projectId, ref: null },
        payload: {
          title: "Project context from active note",
          content: input.content.trim(),
        },
        explicitlyStated: true,
        confidence: 0.8,
        evidence: [snippet || "note"],
        reason: "Preserve project-level narrative from the note",
      },
    ],
    candidateProjects: candidateProjects(input),
    warnings: baseWarnings(),
  };
}

function multiSubjectOutput(input: ActiveNoteAIInput): StubOutput {
  const findProject = (needle: string) =>
    input.candidateProjects.find((project) =>
      project.title.toLowerCase().includes(needle)
    ) ?? null;

  const vital = findProject("vital");
  const abl = findProject("abl");
  const review =
    findProject("customer") ??
    findProject("business") ??
    input.candidateProjects[0] ??
    null;

  const seg1 =
    "Currently waiting for Quick books data to become available for Vital Pak";
  const seg2 =
    "ABL Automation has taken a back seat to other audits for Hilco and KPMG";
  const seg3 = "Kai Li will take over customer business review from Joe";

  const routeFor = (
    segmentRef: string,
    project: { id: string; title: string } | null,
    reason: string
  ) =>
    project
      ? {
          segmentRef,
          destination: "existing_project" as const,
          projectId: project.id,
          relatedTaskId: null,
          reason,
          confidence: 0.86,
          impact: {
            type: "project_context" as const,
            reason: "Segment status/context for this project",
          },
        }
      : {
          segmentRef,
          destination: "new_project" as const,
          projectId: null,
          relatedTaskId: null,
          reason: `${reason}; no candidate project matched`,
          confidence: 0.8,
          impact: null,
        };

  const routes = [
    routeFor("seg_1", vital, "Vital Pak QuickBooks wait"),
    routeFor("seg_2", abl, "ABL Automation deprioritized"),
    routeFor("seg_3", review, "Customer business review handoff"),
  ];

  const noteFor = (
    ref: string,
    segmentRef: string,
    text: string,
    projectId: string | null,
    projectRef: string | null
  ): ActiveNoteProposal => ({
    ref,
    operationType: projectId ? "attach_context" : "create",
    objectType: "note",
    parent: projectId
      ? { projectId, projectRef: null }
      : { projectId: null, projectRef },
    attachment: projectId
      ? { type: "project", id: projectId, ref: null }
      : { type: "project", id: null, ref: projectRef },
    payload: {
      title: text.length > 80 ? `${text.slice(0, 79)}…` : text,
      content: text,
    },
    explicitlyStated: true,
    confidence: 0.88,
    evidence: [text],
    reason: "Log this segment on its project",
    segmentRef,
  });

  const proposals: ActiveNoteProposal[] = [];
  if (!vital) {
    proposals.push({
      ref: "project_seg_1",
      operationType: "suggest_create",
      objectType: "project",
      parent: null,
      attachment: null,
      payload: {
        title: "Vital Pak",
        description: seg1,
      },
      explicitlyStated: true,
      confidence: 0.8,
      evidence: [seg1],
      reason: "Container for Vital Pak context",
      segmentRef: "seg_1",
    });
  }
  proposals.push(
    noteFor(
      "note_seg_1",
      "seg_1",
      seg1,
      vital?.id ?? null,
      vital ? null : "project_seg_1"
    )
  );

  if (!abl) {
    proposals.push({
      ref: "project_seg_2",
      operationType: "suggest_create",
      objectType: "project",
      parent: null,
      attachment: null,
      payload: {
        title: "ABL Automation",
        description: seg2,
      },
      explicitlyStated: true,
      confidence: 0.8,
      evidence: [seg2],
      reason: "Container for ABL Automation context",
      segmentRef: "seg_2",
    });
  }
  proposals.push(
    noteFor(
      "note_seg_2",
      "seg_2",
      seg2,
      abl?.id ?? null,
      abl ? null : "project_seg_2"
    )
  );

  if (!review) {
    proposals.push({
      ref: "project_seg_3",
      operationType: "suggest_create",
      objectType: "project",
      parent: null,
      attachment: null,
      payload: {
        title: "Customer business review",
        description: seg3,
      },
      explicitlyStated: false,
      confidence: 0.8,
      evidence: [seg3],
      reason: "Container for customer business review handoff",
      segmentRef: "seg_3",
    });
  }
  proposals.push(
    noteFor(
      "note_seg_3",
      "seg_3",
      seg3,
      review?.id ?? null,
      review ? null : "project_seg_3"
    )
  );
  proposals.push(
    {
      ref: "person_kai",
      operationType: "create",
      objectType: "person",
      parent: null,
      attachment: null,
      payload: { name: "Kai Li" },
      explicitlyStated: true,
      confidence: 0.92,
      evidence: ["Kai Li"],
      reason: "Named person taking over the review",
      segmentRef: "seg_3",
    },
    {
      ref: "person_joe",
      operationType: "create",
      objectType: "person",
      parent: null,
      attachment: null,
      payload: { name: "Joe" },
      explicitlyStated: true,
      confidence: 0.9,
      evidence: ["from Joe"],
      reason: "Named person handing off the review",
      segmentRef: "seg_3",
    }
  );

  return finalizeStub({
    routing: {
      destination: routes.every((r) => r.destination === "existing_project")
        ? "existing_project"
        : "new_project",
      projectId: null,
      relatedTaskId: null,
      reason:
        "Multi-project note with 3 contexts: Vital Pak; ABL Automation; Customer business review",
      confidence: 0.84,
    },
    impact: null,
    summary:
      "Split into Vital Pak, ABL Automation, and customer business review contexts.",
    segments: [
      { ref: "seg_1", text: seg1, subject: "Vital Pak" },
      { ref: "seg_2", text: seg2, subject: "ABL Automation" },
      { ref: "seg_3", text: seg3, subject: "Customer business review" },
    ],
    routes,
    proposals,
    candidateProjects: candidateProjects(input),
    warnings: baseWarnings(),
  });
}

export function buildStubActiveNoteOutput(
  input: ActiveNoteAIInput
): ActiveNoteAIOutput {
  const content = input.content.trim().toLowerCase();

  if (
    content.includes("vital pak") &&
    content.includes("abl automation") &&
    (content.includes("kai li") || content.includes("customer business review"))
  ) {
    return multiSubjectOutput(input);
  }
  if (
    content.includes("eight-week") ||
    content.includes("eight week") ||
    (content.includes("lead teep") && content.includes("drill"))
  ) {
    return finalizeStub(newProjectOutput(input));
  }
  if (
    content.includes("sparred a big guy") ||
    content.includes("problems landing a teep")
  ) {
    return finalizeStub(observationOutput(input));
  }
  if (content.includes("practice teep setups")) {
    return finalizeStub(explicitTaskOutput(input));
  }
  if (content.includes("i decided") || content.includes("decided to")) {
    return finalizeStub(decisionOutput(input));
  }
  if (content.includes("maybe ") || content.includes("could produce")) {
    return finalizeStub(ideaOutput(input));
  }
  if (content.includes("coach marcus")) {
    return finalizeStub(namedPersonOutput(input));
  }

  return finalizeStub(fallbackOutput(input));
}

/** Deterministic fake analyzer for local UI work without OpenAI. */
export class StubActiveNoteAIProvider implements ActiveNoteAIProvider {
  async analyze(input: ActiveNoteAIInput): Promise<ActiveNoteAIOutput> {
    await delay(350);
    return buildStubActiveNoteOutput(input);
  }
}
