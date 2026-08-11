import type { INoteUpdateModelInput } from "../mappers/notes/note.mapper.js";
import type { NoteNode } from "../models/notes/index.js";
import type { ITaskProjectRef } from "./task-repository.js";
import type { IRepository } from "./repository.js";

export interface INoteListItem {
  note: NoteNode;
  project: ITaskProjectRef | null;
}

export interface INoteRepository extends IRepository<NoteNode> {
  listByOrg(orgId: string): Promise<NoteNode[]>;
  listByOrgWithProjects(orgId: string): Promise<INoteListItem[]>;
  findByIdForOrg(id: string, orgId: string): Promise<NoteNode | null>;
  getListItemForOrg(orgId: string, noteId: string): Promise<INoteListItem | null>;
  updateForOrg(
    orgId: string,
    noteId: string,
    input: INoteUpdateModelInput
  ): Promise<NoteNode | null>;
}
