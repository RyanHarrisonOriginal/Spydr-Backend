import type { IDomainNodeProps, SpydrPriority, ITimestampedDetails } from "../../shared/models/shared.js";
import type { DecisionNode } from "../../decisions/models/index.js";
import type { IdeaNode } from "../../ideas/models/index.js";
import type { NoteNode } from "../../notes/models/index.js";
import type { ResourceNode } from "../../resources/models/index.js";
import type { TaskNode } from "../../tasks/models/index.js";
import type { IProjectPersonas } from "./personas.js";

export interface IProjectDetailsProps extends ITimestampedDetails {
  outcome: string | null;
  startDate: Date | null;
  targetDate: Date | null;
  riskLevel: SpydrPriority;
  lastActivityAt: Date | null;
  requesterPersonNodeId: string | null;
  assigneePersonNodeId: string | null;
  sponsorPersonNodeId: string | null;
  reviewerPersonNodeId: string | null;
}

export interface IProjectNodeProps extends Omit<IDomainNodeProps<"project">, "nodeType"> {
  details: IProjectDetailsProps | null;
  personas?: IProjectPersonas;
  tasks?: TaskNode[];
  decisions?: DecisionNode[];
  ideas?: IdeaNode[];
  notes?: NoteNode[];
  resources?: ResourceNode[];
  deletedTasks?: TaskNode[];
  deletedDecisions?: DecisionNode[];
  deletedIdeas?: IdeaNode[];
  deletedNotes?: NoteNode[];
  deletedResources?: ResourceNode[];
}
