import type { NoteNode } from "../models/notes/index.js";
import type { IRepository } from "./repository.js";

export interface INoteRepository extends IRepository<NoteNode> {
  listByUser(userId: string): Promise<NoteNode[]>;
  findByIdForUser(id: string, userId: string): Promise<NoteNode | null>;
}
