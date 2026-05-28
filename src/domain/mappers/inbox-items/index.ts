import type { IDomainMapper } from "../mapper.js";
import type { InboxItemNode } from "../../models/inbox-items/index.js";

export type InboxItemNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  InboxItemNode
>;
