import type {
  DomainNode,
  SpydrNodeStatus,
  SpydrNodeType,
} from "../models/index.js";
import type { IRepository } from "./repository.js";

export interface ISpydrNodeListCriteria {
  orgId: string;
  nodeType?: SpydrNodeType;
  status?: SpydrNodeStatus;
  tag?: string;
}

export interface ISpydrNodeRepository extends IRepository<DomainNode> {
  list(criteria: ISpydrNodeListCriteria): Promise<DomainNode[]>;
  findByIdForOrg(id: string, orgId: string): Promise<DomainNode | null>;
  reorderForOrg(
    orgId: string,
    nodeType: SpydrNodeType,
    orderedIds: readonly string[]
  ): Promise<void>;
}
