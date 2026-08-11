import type { IDomainMapper } from "../mapper.js";
import type { IdeaNode } from "../../models/ideas/index.js";

export type IdeaNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  IdeaNode
>;

export { IdeaMapper } from "./idea.mapper.js";
export type {
  IIdeaCreateModelInput,
  IIdeaCreateModelContext,
} from "./idea.mapper.js";
