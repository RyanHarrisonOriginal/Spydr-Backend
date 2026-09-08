import type { IRepository } from "../shared/repository.js";
import type { DomainNode, SpydrNodeType } from "../shared/models/shared.js";

export interface ISpydrNodeRepository extends IRepository<DomainNode> {}

export type SpydrNodeSaveStrategyKey = "standard" | "reorder";

export interface ISpydrNodeReorderContext {
  orgId: string;
  nodeType: SpydrNodeType;
  orderedIds: readonly string[];
}
