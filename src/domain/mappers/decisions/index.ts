import type { IDomainMapper } from "../mapper.js";
import type { DecisionNode } from "../../models/decisions/index.js";

export type DecisionNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  DecisionNode
>;

export { DecisionMapper } from "./decision.mapper.js";
export type {
  IDecisionCreateModelInput,
  IDecisionCreateModelContext,
} from "./decision.mapper.js";
