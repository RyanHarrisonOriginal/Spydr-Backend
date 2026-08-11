import type { ProjectLoaderService } from "./project-loader.service.js";
import { projectLoaderService } from "./project-loader.service.js";
import type {
  ProjectRetrievalContext,
  ProjectRetrievalNote,
  ProjectRetrievalTask,
} from "./project-retrieval.types.js";

export function normalizeRetrievalText(
  value: string | null | undefined
): string | null {
  if (value == null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatTitledBullet(title: string): string {
  return `- ${title.trim()}`;
}

function formatTaskBullet(task: ProjectRetrievalTask): string {
  const title = task.title.trim();
  const description = normalizeRetrievalText(task.description);

  return description ? `- ${title}: ${description}` : `- ${title}`;
}

function formatNoteBullet(note: ProjectRetrievalNote): string {
  const subject = note.subject.trim();
  const content = normalizeRetrievalText(note.content);

  return content ? `- ${subject}: ${content}` : `- ${subject}`;
}

export function formatProjectRetrievalDocument(
  context: ProjectRetrievalContext
): string {
  const sections: string[] = [`PROJECT: ${context.project.title.trim()}`];

  const description = normalizeRetrievalText(context.project.description);
  if (description) {
    sections.push("", "DESCRIPTION:", description);
  }

  if (context.openTasks.length > 0) {
    sections.push("", "OPEN TASKS:");
    sections.push(
      ...context.openTasks.map((task) => formatTaskBullet(task))
    );
  }

  if (context.recentDecisions.length > 0) {
    sections.push("", "RECENT DECISIONS:");
    sections.push(
      ...context.recentDecisions.map((decision) =>
        formatTitledBullet(decision.title)
      )
    );
  }

  if (context.recentIdeas.length > 0) {
    sections.push("", "RECENT IDEAS:");
    sections.push(
      ...context.recentIdeas.map((idea) => formatTitledBullet(idea.title))
    );
  }

  if (context.recentNotes.length > 0) {
    sections.push("", "RECENT CONTEXT:");
    sections.push(...context.recentNotes.map((note) => formatNoteBullet(note)));
  }

  return sections.join("\n");
}

export async function buildProjectRetrievalDocument(
  projectId: string,
  loader: ProjectLoaderService = projectLoaderService
): Promise<string> {
  const context = await loader.loadProjectRetrievalContext(projectId);

  if (!context) {
    throw new Error(`Project not found or deleted: ${projectId}`);
  }

  return formatProjectRetrievalDocument(context);
}
