import type { IRepository } from "../shared/repository.js";
import type { NoteNode } from "./models/index.js";

export interface INoteRepository extends IRepository<NoteNode> {}

export type NoteSaveStrategyKey = "standard";
