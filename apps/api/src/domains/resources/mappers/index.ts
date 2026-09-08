import type { IDomainMapper } from "../../shared/mappers/mapper.js";
import type { ResourceNode } from "../models/index.js";

export type ResourceNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  ResourceNode
>;
