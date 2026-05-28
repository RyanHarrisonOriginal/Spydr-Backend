import type { IDomainNodeProps, SpydrPriority, ITimestampedDetails } from "../shared.js";
import type { DecisionNode } from "../decisions/index.js";
import type { IdeaNode } from "../ideas/index.js";
import type { NoteNode } from "../notes/index.js";
import type { ResourceNode } from "../resources/index.js";
import type { TaskNode } from "../tasks/index.js";

export interface IProjectDetailsProps extends ITimestampedDetails {
  outcome: string | null;
  startDate: Date | null;
  targetDate: Date | null;
  riskLevel: SpydrPriority;
  lastActivityAt: Date | null;
}

export interface IProjectNodeProps extends Omit<IDomainNodeProps<"project">, "nodeType"> {
  details: IProjectDetailsProps | null;
  tasks?: TaskNode[];
  decisions?: DecisionNode[];
  ideas?: IdeaNode[];
  notes?: NoteNode[];
  resources?: ResourceNode[];
}
