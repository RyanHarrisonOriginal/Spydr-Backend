import type { IDomainNodeProps, SpydrPriority, ITimestampedDetails } from "../shared.js";

export interface IIdeaDetailsProps extends ITimestampedDetails {
  confidence: number | null;
  potentialValue: SpydrPriority;
  promotedToProjectNodeId: string | null;
}

export interface IIdeaNodeProps extends Omit<IDomainNodeProps<"idea">, "nodeType"> {
  details: IIdeaDetailsProps | null;
}
