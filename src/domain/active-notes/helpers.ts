import type {
  ActiveNoteCandidateProject,
  ActiveNoteProjectContext,
} from "./types.js";

export function buildActiveNoteUserPrompt(input: {
  content: string;
  selectedProject: ActiveNoteProjectContext | null;
  candidateProjects: ActiveNoteCandidateProject[];
  candidateProjectContexts?: ActiveNoteProjectContext[];
}): string {
  const context = {
    stageGuidance: {
      route:
        "Prefer existing_project on clear fit; else run NEW PROJECT COHESION TEST → new_project when cohesive; idea_only only for idle speculation",
      interpret:
        "If existing_project, set impact (task_context | new_task | project_context | decision | idea | mixed); if new_project, impact=null",
      plan:
        "For new_project: one outcome-titled Project, then Tasks/Decisions/Ideas/Notes only as supported (projectRef)",
    },
    selectedProject: input.selectedProject,
    candidateProjects: input.candidateProjects,
    candidateProjectContexts:
      input.candidateProjectContexts ??
      (input.selectedProject ? [input.selectedProject] : []),
  };

  return [
    "Analyze the following Active Note as one coherent change to the user's execution structure.",
    "",
    "User note:",
    input.content,
    "",
    "Available project context (do not invent ids outside this list):",
    JSON.stringify(context, null, 2),
    "",
    "Return JSON matching the required schema only.",
  ].join("\n");
}
