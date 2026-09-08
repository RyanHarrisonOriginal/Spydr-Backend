import type { IDomainMapper } from "../../shared/mappers/mapper.js";
import type { InboxItemNode } from "../models/index.js";

export type InboxItemNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  InboxItemNode
>;
