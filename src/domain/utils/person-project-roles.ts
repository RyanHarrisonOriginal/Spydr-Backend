import type { ProjectNode } from "../models/projects/index.js";

export type PersonProjectRole = "requester" | "assignee" | "sponsor" | "reviewer";

export function getPersonProjectRoles(
  project: ProjectNode,
  personId: string
): PersonProjectRole[] {
  const details = project.details;
  if (!details) return [];

  const roles: PersonProjectRole[] = [];
  if (details.requesterPersonNodeId === personId) roles.push("requester");
  if (details.assigneePersonNodeId === personId) roles.push("assignee");
  if (details.sponsorPersonNodeId === personId) roles.push("sponsor");
  if (details.reviewerPersonNodeId === personId) roles.push("reviewer");
  return roles;
}

export function projectInvolvesPerson(project: ProjectNode, personId: string): boolean {
  return getPersonProjectRoles(project, personId).length > 0;
}
