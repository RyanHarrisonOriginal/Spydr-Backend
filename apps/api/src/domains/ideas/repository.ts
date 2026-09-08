import type { IRepository } from "../shared/repository.js";
import type { IdeaNode } from "./models/index.js";
export interface IIdeaRepository extends IRepository<IdeaNode> {}
