import type { InboxItemNode } from "../models/inbox-items/index.js";
import type { IRepository } from "./repository.js";

export interface IInboxItemRepository extends IRepository<InboxItemNode> {
  listByUser(userId: string): Promise<InboxItemNode[]>;
  findByIdForUser(id: string, userId: string): Promise<InboxItemNode | null>;
  listUnprocessed(userId: string): Promise<InboxItemNode[]>;
}
