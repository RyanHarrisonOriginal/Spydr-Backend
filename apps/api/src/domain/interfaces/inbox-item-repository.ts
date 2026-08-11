import type { InboxItemNode } from "../models/inbox-items/index.js";
import type { IRepository } from "./repository.js";

export interface IInboxItemRepository extends IRepository<InboxItemNode> {
  listByOrg(orgId: string): Promise<InboxItemNode[]>;
  findByIdForOrg(id: string, orgId: string): Promise<InboxItemNode | null>;
  listUnprocessed(orgId: string): Promise<InboxItemNode[]>;
}
