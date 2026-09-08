import type { IDomainMapper } from "../../shared/mappers/mapper.js";
import type { DecisionNode } from "../../decisions/models/index.js";

export type DecisionNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  DecisionNode
>;

export { DecisionMapper } from "./decision.mapper.js";
export type {
  IDecisionCreateModelInput,
  IDecisionCreateModelContext,
} from "./decision.mapper.js";
