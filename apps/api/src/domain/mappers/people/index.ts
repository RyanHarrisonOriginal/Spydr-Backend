import type { IDomainMapper } from "../mapper.js";
import type { PersonNode } from "../../models/people/index.js";

export { PersonMapper } from "./person.mapper.js";
export type {
  IPersonCreateModelInput,
  IPersonUpdateModelInput,
} from "./person.mapper.js";

export type PersonNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  PersonNode
>;
