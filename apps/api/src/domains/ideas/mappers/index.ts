import type { IDomainMapper } from "../../shared/mappers/mapper.js";
import type { IdeaNode } from "../../ideas/models/index.js";

export type IdeaNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  IdeaNode
>;

export { IdeaMapper } from "./idea.mapper.js";
export type {
  IIdeaCreateModelInput,
  IIdeaCreateModelContext,
} from "./idea.mapper.js";
