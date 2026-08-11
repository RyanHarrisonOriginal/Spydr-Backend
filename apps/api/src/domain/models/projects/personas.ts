import type { PersonNode } from "../people/index.js";

export type ProjectPersonaRole = "requester" | "assignee" | "sponsor" | "reviewer";

export interface IProjectPersonas {
  requester: PersonNode | null;
  assignee: PersonNode | null;
  sponsor: PersonNode | null;
  reviewer: PersonNode | null;
}

export const projectPersonaRoles = [
  "requester",
  "assignee",
  "sponsor",
  "reviewer",
] as const satisfies readonly ProjectPersonaRole[];

export const projectPersonaLabels: Record<ProjectPersonaRole, string> = {
  requester: "Requester",
  assignee: "Assignee",
  sponsor: "Sponsor",
  reviewer: "Reviewer",
};

export const projectPersonaHints: Record<ProjectPersonaRole, string> = {
  requester: "Who initiated or owns the ask",
  assignee: "Primary person doing the work",
  sponsor: "Executive or stakeholder backing",
  reviewer: "Sign-off or quality gate",
};

export const emptyProjectPersonas = (): IProjectPersonas => ({
  requester: null,
  assignee: null,
  sponsor: null,
  reviewer: null,
});
