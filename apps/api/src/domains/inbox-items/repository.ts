import type { IRepository } from "../shared/repository.js";
import type { InboxItemNode } from "./models/index.js";

export interface IInboxItemRepository extends IRepository<InboxItemNode> {}
