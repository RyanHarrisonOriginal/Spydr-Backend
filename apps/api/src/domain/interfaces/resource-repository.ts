import type { ResourceNode } from "../models/resources/index.js";
import type { IRepository } from "./repository.js";

export interface IResourceRepository extends IRepository<ResourceNode> {
  listByOrg(orgId: string): Promise<ResourceNode[]>;
  findByIdForOrg(id: string, orgId: string): Promise<ResourceNode | null>;
}
