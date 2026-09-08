import type { DomainNode, SpydrNodeStatus, SpydrNodeType } from "../shared/models/shared.js";

export interface ISpydrNodeListCriteria {
  orgId: string;
  nodeType?: SpydrNodeType;
  status?: SpydrNodeStatus;
  tag?: string;
}

export interface ISpydrNodeViews {
  list(criteria: ISpydrNodeListCriteria): Promise<DomainNode[]>;
  nextSortOrderForOrg(orgId: string, nodeType: SpydrNodeType): Promise<number>;
}
