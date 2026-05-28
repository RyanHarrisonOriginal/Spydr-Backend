import type { PersonNode } from "../models/people/index.js";
import type { IRepository } from "./repository.js";

export interface IPersonRepository extends IRepository<PersonNode> {
  listByUser(userId: string): Promise<PersonNode[]>;
  findByIdForUser(id: string, userId: string): Promise<PersonNode | null>;
}
