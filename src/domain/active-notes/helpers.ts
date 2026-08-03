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
  const projectCatalog =
    input.candidateProjectContexts ??
    (input.selectedProject ? [input.selectedProject] : []);

  const context = {
    stageGuidance: {
      split:
        "Split into independent subject segments when needed (cap 5). One segment for single-subject notes. Do not assign projects during split.",
      match:
        "Match each segment to the single best catalog project with confidence, or new_project when no catalog entry fits (confidence >= 0.60 for existing_project).",
      act:
        "Run segment intent test per segment (Decision→Task→Idea→Note). new_project = Project + primary child (never Project alone). Every payload.title required.",
    },
    selectedProject: input.selectedProject,
    projectCatalog,
    candidateProjects: input.candidateProjects,
  };

  return [
    "Analyze the following Active Note using SPLIT → MATCH → ACT.",
    "",
    "User note:",
    input.content,
    "",
    "Available project catalog (do not invent ids outside this list):",
    JSON.stringify(context, null, 2),
    "",
    "Return JSON matching the required schema only.",
  ].join("\n");
}
