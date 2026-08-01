export const ACTIVE_NOTE_PROMPT_VERSION = "active-note-v3";

export const ACTIVE_NOTE_MAX_CONTENT_LENGTH = 8000;
export const ACTIVE_NOTE_MAX_PROPOSALS = 8;

export type ActiveNoteOperationType =
  | "create"
  | "suggest_create"
  | "attach_context"
  | "no_action";

export type ActiveNoteObjectType =
  | "project"
  | "task"
  | "note"
  | "decision"
  | "idea"
  | "person";

export type ActiveNoteRoutingDestination =
  | "existing_project"
  | "new_project"
  | "idea_only"
  | "no_action";

export type ExistingProjectImpact =
  | "task_context"
  | "new_task"
  | "project_context"
  | "decision"
  | "idea"
  | "mixed";

export type ActiveNotePriority = "low" | "medium" | "high";

export interface ActiveNoteRoutingDecision {
  destination: ActiveNoteRoutingDestination;
  projectId?: string | null;
  relatedTaskId?: string | null;
  reason: string;
  confidence: number;
}

export interface ActiveNoteImpact {
  type: ExistingProjectImpact;
  reason: string;
}

export interface ActiveNoteProposalPayload {
  title?: string;
  description?: string;
  content?: string;
  rationale?: string;
  name?: string;
  priority?: ActiveNotePriority;
  dueDate?: string | null;
}

export interface ActiveNoteProposalParent {
  projectId?: string | null;
  projectRef?: string | null;
}

export interface ActiveNoteProposalAttachment {
  type: "project" | "task";
  id?: string | null;
  ref?: string | null;
}

export interface ActiveNoteProposal {
  ref: string;
  operationType: ActiveNoteOperationType;
  objectType: ActiveNoteObjectType;
  parent?: ActiveNoteProposalParent | null;
  attachment?: ActiveNoteProposalAttachment | null;
  payload: ActiveNoteProposalPayload;
  explicitlyStated: boolean;
  confidence: number;
  evidence: string[];
  reason: string;
  /**
   * Compatibility fields derived during normalization for existing UI/apply.
   * Prefer parent.projectId / parent.projectRef for new consumers.
   */
  requiresProject?: boolean;
  suggestedProjectId?: string | null;
}

export interface ActiveNoteCandidateProject {
  id: string;
  title: string;
  relevanceReason?: string;
}

export interface ActiveNoteAIOutput {
  routing: ActiveNoteRoutingDecision;
  impact?: ActiveNoteImpact | null;
  summary: string;
  proposals: ActiveNoteProposal[];
  candidateProjects: ActiveNoteCandidateProject[];
  warnings: string[];
}

export interface ActiveNoteAnalyzeRequest {
  content: string;
  projectId?: string | null;
}

export interface ActiveNoteContextTask {
  id: string;
  title: string;
  description?: string;
  status: string;
}

export interface ActiveNoteContextNote {
  id: string;
  title: string;
  contentPreview?: string;
  relatedTaskId?: string | null;
}

export interface ActiveNoteContextDecision {
  id: string;
  title: string;
}

export interface ActiveNoteContextIdea {
  id: string;
  title: string;
}

/** Compact candidate / selected project context sent to the model. */
export interface ActiveNoteProjectContext {
  id: string;
  title: string;
  description: string;
  openTasks: ActiveNoteContextTask[];
  recentNotes: ActiveNoteContextNote[];
  recentDecisions: ActiveNoteContextDecision[];
  recentIdeas: ActiveNoteContextIdea[];
}

export interface ActiveNoteAIInput {
  content: string;
  promptVersion: string;
  selectedProject: ActiveNoteProjectContext | null;
  /** Lightweight list for allowlisting ids in the prompt. */
  candidateProjects: ActiveNoteCandidateProject[];
  /** Hydrated context for strongest candidates (includes open tasks). */
  candidateProjectContexts: ActiveNoteProjectContext[];
}

export interface ActiveNoteAIProvider {
  analyze(input: ActiveNoteAIInput): Promise<ActiveNoteAIOutput>;
}

export class ActiveNoteAnalysisError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 502) {
    super(message);
    this.name = "ActiveNoteAnalysisError";
    this.statusCode = statusCode;
  }
}

export class ActiveNoteApplyError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "ActiveNoteApplyError";
    this.statusCode = statusCode;
  }
}

export type ActiveNoteApplyObjectType =
  | ActiveNoteObjectType
  | "goal"
  | "relationship";

export type ActiveNoteApplyPayloadKind =
  | "project"
  | "task"
  | "note"
  | "goal"
  | "decision"
  | "idea"
  | "person"
  | "link"
  | "no_action";

export interface ActiveNoteApplyPayload {
  kind: ActiveNoteApplyPayloadKind;
  title?: string;
  description?: string;
  content?: string;
  rationale?: string;
  name?: string;
  priority?: ActiveNotePriority | string;
  dueDate?: string | null;
  status?: string;
  projectId?: string | null;
  subtype?: string | null;
  sourceObjectId?: string | null;
  sourceLabel?: string;
  targetObjectId?: string;
  targetLabel?: string;
  targetObjectType?: ActiveNoteApplyObjectType;
  relationshipType?: string;
  message?: string;
}

export interface ActiveNoteApplyOperationInput {
  operationId: string;
  selected: boolean;
  objectType?: ActiveNoteApplyObjectType | null;
  payload: ActiveNoteApplyPayload;
  selectedProjectId?: string | null;
  projectRef?: string | null;
  duplicateResolution?: "attach_existing" | "create_new" | "ignore" | null;
  targetObjectId?: string | null;
  attachment?: {
    type: "project" | "task";
    id?: string | null;
    ref?: string | null;
  } | null;
}

export interface ActiveNoteApplyRequest {
  activeNoteId?: string;
  content?: string;
  projectId?: string | null;
  operations: ActiveNoteApplyOperationInput[];
}

export interface AppliedActiveNoteObject {
  id: string;
  type: ActiveNoteApplyObjectType;
  title: string;
  action: "created" | "updated" | "linked";
  href: string;
}

export interface ActiveNoteApplyResult {
  activeNote: {
    id: string;
    content: string;
    projectId: string | null;
    status: "completed" | "failed";
    createdAt: string;
    updatedAt: string;
  };
  applied: AppliedActiveNoteObject[];
  failed: Array<{
    operationId: string;
    message: string;
  }>;
  partial: boolean;
}
