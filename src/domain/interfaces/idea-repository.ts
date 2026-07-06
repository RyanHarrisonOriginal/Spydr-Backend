import type { IdeaNode } from "../models/ideas/index.js";
import type { IRepository } from "./repository.js";

export interface IIdeaRepository extends IRepository<IdeaNode> {
  listByOrg(orgId: string): Promise<IdeaNode[]>;
  findByIdForOrg(id: string, orgId: string): Promise<IdeaNode | null>;
}
