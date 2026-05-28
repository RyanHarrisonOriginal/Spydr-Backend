import type { ResourceNode } from "../models/resources/index.js";
import type { IRepository } from "./repository.js";

export interface IResourceRepository extends IRepository<ResourceNode> {
  listByUser(userId: string): Promise<ResourceNode[]>;
  findByIdForUser(id: string, userId: string): Promise<ResourceNode | null>;
}
