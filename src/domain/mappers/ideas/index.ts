import type { IDomainMapper } from "../mapper.js";
import type { IdeaNode } from "../../models/ideas/index.js";

export type IdeaNodeMapper<TPersistence = unknown> = IDomainMapper<TPersistence, IdeaNode>;
