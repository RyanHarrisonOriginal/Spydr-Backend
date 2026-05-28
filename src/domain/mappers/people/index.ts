import type { IDomainMapper } from "../mapper.js";
import type { PersonNode } from "../../models/people/index.js";

export type PersonNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  PersonNode
>;
