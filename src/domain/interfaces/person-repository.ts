import type { PersonNode } from "../models/people/index.js";
import type { IRepository } from "./repository.js";

export interface IPersonRepository extends IRepository<PersonNode> {
  listByOrg(orgId: string): Promise<PersonNode[]>;
  findByIdForOrg(id: string, orgId: string): Promise<PersonNode | null>;
  clearPersonReferences(orgId: string, personId: string): Promise<void>;
}
