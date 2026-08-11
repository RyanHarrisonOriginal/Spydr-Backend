export const MAX_OPEN_TASKS = 25;
export const MAX_RECENT_TASKS = 10;
export const MAX_RECENT_NOTES = 10;
export const MAX_RECENT_DECISIONS = 10;
export const MAX_RECENT_IDEAS = 10;

export type ProjectActionContext = {
  project: {
    id: string;
    title: string;
    description?: string | null;
  };
  openTasks: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    updatedAt: string;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    description?: string | null;
    status: string;
    updatedAt: string;
  }>;
  recentNotes: Array<{
    id: string;
    subject: string;
    content?: string | null;
    taskId?: string | null;
    createdAt: string;
  }>;
  recentDecisions: Array<{
    id: string;
    title: string;
    rationale?: string | null;
    createdAt: string;
  }>;
  recentIdeas: Array<{
    id: string;
    title: string;
    description?: string | null;
    createdAt: string;
  }>;
};
