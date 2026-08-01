import { getTaskStatusBucket } from "../models/shared.js";
import type { ProjectNode } from "../models/projects/index.js";
import type {
  ActiveNoteCandidateProject,
  ActiveNoteProjectContext,
} from "./types.js";

function sortByUpdatedDesc<T extends { updatedAt: Date }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length >= 3);
}

function preview(text: string | null | undefined, max = 160): string | undefined {
  const trimmed = text?.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function toProjectContext(project: ProjectNode): ActiveNoteProjectContext {
  const openTasks = sortByUpdatedDesc(
    project.tasks.filter((task) => getTaskStatusBucket(task.status) === "open")
  )
    .slice(0, 10)
    .map((task) => ({
      id: task.id,
      title: task.title,
      description: preview(task.body) ?? undefined,
      status: task.status,
    }));

  const recentNotes = sortByUpdatedDesc(project.notes)
    .slice(0, 10)
    .map((note) => ({
      id: note.id,
      title: note.title,
      contentPreview: preview(note.body),
      relatedTaskId: null as string | null,
    }));

  const recentDecisions = sortByUpdatedDesc(project.decisions)
    .slice(0, 5)
    .map((decision) => ({
      id: decision.id,
      title: decision.title,
    }));

  const recentIdeas = sortByUpdatedDesc(project.ideas)
    .slice(0, 5)
    .map((idea) => ({
      id: idea.id,
      title: idea.title,
    }));

  return {
    id: project.id,
    title: project.title,
    description: project.body || project.details?.outcome || "",
    openTasks,
    recentNotes,
    recentDecisions,
    recentIdeas,
  };
}

export function scoreProjectMatch(
  content: string,
  project: ProjectNode
): number {
  const contentTokens = new Set(tokenize(content));
  if (contentTokens.size === 0) return 0;

  const projectText = `${project.title} ${project.body} ${project.details?.outcome ?? ""}`;
  const projectTokens = tokenize(projectText);
  if (projectTokens.length === 0) return 0;

  let overlap = 0;
  for (const token of projectTokens) {
    if (contentTokens.has(token)) overlap += 1;
  }

  const titleTokens = tokenize(project.title);
  let titleOverlap = 0;
  for (const token of titleTokens) {
    if (contentTokens.has(token)) titleOverlap += 1;
  }

  // Light boost when open task titles overlap the note.
  let taskOverlap = 0;
  for (const task of project.tasks) {
    if (getTaskStatusBucket(task.status) !== "open") continue;
    for (const token of tokenize(task.title)) {
      if (contentTokens.has(token)) taskOverlap += 1;
    }
  }

  return overlap + titleOverlap * 2 + Math.min(taskOverlap, 4);
}

export function selectCandidateProjects(
  content: string,
  projects: ProjectNode[],
  limit = 5
): ActiveNoteCandidateProject[] {
  const activeProjects = projects.filter(
    (project) =>
      !project.isDeleted &&
      project.status !== "archived" &&
      project.status !== "completed"
  );

  const scored = activeProjects
    .map((project) => ({
      project,
      score: scoreProjectMatch(content, project),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.project.updatedAt.getTime() - a.project.updatedAt.getTime();
    });

  const matched = scored.filter((item) => item.score > 0).slice(0, limit);
  const selected =
    matched.length > 0
      ? matched
      : scored.slice(0, limit).map((item) => ({
          ...item,
          score: 0,
        }));

  return selected.map(({ project, score }) => ({
    id: project.id,
    title: project.title,
    relevanceReason:
      score > 0
        ? "Title, description, or open-task overlap with the note"
        : "Recent active project",
  }));
}

/** Map of taskId → projectId for validation. */
export function collectTaskProjectMap(
  contexts: ActiveNoteProjectContext[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const project of contexts) {
    for (const task of project.openTasks) {
      map.set(task.id, project.id);
    }
  }
  return map;
}
