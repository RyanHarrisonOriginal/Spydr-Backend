import type { IDomainNodeProps, ITimestampedDetails } from "../shared.js";

export interface IDecisionDetailsProps extends ITimestampedDetails {
  rationale: string;
  impact: string;
  decidedAt: Date;
  supersedesDecisionNodeId: string | null;
}

export interface IDecisionNodeProps extends Omit<IDomainNodeProps<"decision">, "nodeType"> {
  details: IDecisionDetailsProps | null;
}
