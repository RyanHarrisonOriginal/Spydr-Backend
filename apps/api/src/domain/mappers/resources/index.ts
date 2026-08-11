import type { IDomainMapper } from "../mapper.js";
import type { ResourceNode } from "../../models/resources/index.js";

export type ResourceNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  ResourceNode
>;
