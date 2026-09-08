import type { IRepository } from "../shared/repository.js";
import type { PersonNode } from "./models/index.js";

export interface IPersonRepository extends IRepository<PersonNode> {}

export type PersonSaveStrategyKey = "standard" | "clearReferences";
