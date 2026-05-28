import type { IdeaNode } from "../models/ideas/index.js";
import type { IRepository } from "./repository.js";

export interface IIdeaRepository extends IRepository<IdeaNode> {
  listByUser(userId: string): Promise<IdeaNode[]>;
  findByIdForUser(id: string, userId: string): Promise<IdeaNode | null>;
}
