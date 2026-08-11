import type { SpydrNodeStatus, SpydrNodeType } from "@prisma/client";

export interface ProjectRetrievalContext {
  project: {
    title: string;
    description: string | null;
  };
  openTasks: ProjectRetrievalTask[];
  recentDecisions: ProjectRetrievalTitledItem[];
  recentIdeas: ProjectRetrievalTitledItem[];
  recentNotes: ProjectRetrievalNote[];
}

/** Raw project fields loaded from `SpydrNode` before formatting. */
export interface ProjectRetrievalProjectRow {
  title: string;
  body: string;
}

/** Raw task row mapped from `SpydrNode` + task status fields. */
export interface ProjectRetrievalTaskRow {
  id: string;
  title: string;
  body: string;
  status: SpydrNodeStatus;
  sortOrder: number;
  updatedAt: Date;
}

/** Raw decision row mapped from `SpydrNode` + `SpydrDecisionDetails`. */
export interface ProjectRetrievalDecisionRow {
  id: string;
  title: string;
  updatedAt: Date;
  decidedAt: Date | null;
}

/** Raw idea row mapped from `SpydrNode`. */
export interface ProjectRetrievalIdeaRow {
  id: string;
  title: string;
  updatedAt: Date;
}

/** Raw note row mapped from `SpydrNode`. */
export interface ProjectRetrievalNoteRow {
  id: string;
  title: string;
  body: string;
  updatedAt: Date;
}

/** Input shape for `buildProjectRetrievalContextFromRows`. */
export interface ProjectRetrievalContextRows {
  project: ProjectRetrievalProjectRow;
  tasks: ProjectRetrievalTaskRow[];
  decisions: ProjectRetrievalDecisionRow[];
  ideas: ProjectRetrievalIdeaRow[];
  notes: ProjectRetrievalNoteRow[];
}

export interface ProjectRetrievalTask {
  title: string;
  description: string | null;
  sortOrder: number;
  updatedAt: Date;
  id: string;
}

export interface ProjectRetrievalTitledItem {
  title: string;
  updatedAt: Date;
  id: string;
}

export interface ProjectRetrievalNote {
  subject: string;
  content: string | null;
  updatedAt: Date;
  id: string;
}

/** Prisma select shape for project-scoped retrieval child nodes. */
export interface RelatedRetrievalNode {
  id: string;
  nodeType: SpydrNodeType;
  title: string;
  body: string;
  status: SpydrNodeStatus;
  sortOrder: number;
  updatedAt: Date;
  decisionDetails: {
    decidedAt: Date;
  } | null;
}

export type ProjectRetrievalChildRows = Omit<
  ProjectRetrievalContextRows,
  "project"
>;
