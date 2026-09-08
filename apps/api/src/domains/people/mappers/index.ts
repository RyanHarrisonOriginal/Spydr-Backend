import type { IDomainMapper } from "../../shared/mappers/mapper.js";
import type { PersonNode } from "../models/index.js";

export { PersonMapper } from "./person.mapper.js";
export type { IPersonCreateModelInput } from "./person.mapper.js";

export type PersonNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  PersonNode
>;
