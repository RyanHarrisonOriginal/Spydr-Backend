import type { IDomainMapper } from "../mapper.js";
import type { DecisionNode } from "../../models/decisions/index.js";

export type DecisionNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  DecisionNode
>;
