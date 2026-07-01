import type {
  DomainNode,
  SpydrNodeStatus,
  SpydrNodeType,
} from "../models/index.js";
import type { IRepository } from "./repository.js";

export interface ISpydrNodeListCriteria {
  userId: string;
  nodeType?: SpydrNodeType;
  status?: SpydrNodeStatus;
  tag?: string;
}

export interface ISpydrNodeRepository extends IRepository<DomainNode> {
  list(criteria: ISpydrNodeListCriteria): Promise<DomainNode[]>;
  findByIdForUser(id: string, userId: string): Promise<DomainNode | null>;
  reorderForUser(
    userId: string,
    nodeType: SpydrNodeType,
    orderedIds: readonly string[]
  ): Promise<void>;
}
