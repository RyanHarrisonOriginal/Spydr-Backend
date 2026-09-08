export type ActiveNotePriority = "low" | "medium" | "high";

export type ActiveNoteApplyObjectType =
  | "project"
  | "task"
  | "note"
  | "decision"
  | "idea"
  | "person"
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
  subject?: string;
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
  targetObjectId?: string | null;
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
  operationId?: string;
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
