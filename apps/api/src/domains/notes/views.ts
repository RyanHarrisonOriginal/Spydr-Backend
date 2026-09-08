import type { NoteNode } from "./models/index.js";

export interface INoteProjectRef { id: string; title: string; }
export interface INoteListItem { note: NoteNode; project: INoteProjectRef | null; }
export interface INoteViews {
  listByOrg(orgId: string): Promise<INoteListItem[]>;
  getListItem(orgId: string, noteId: string): Promise<INoteListItem | null>;
}
