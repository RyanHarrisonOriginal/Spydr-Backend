import type { IDomainMapper } from "../mapper.js";
import type { NoteNode } from "../../models/notes/index.js";

export type NoteNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  NoteNode
>;

export { NoteMapper } from "./note.mapper.js";
export type {
  INoteCreateModelInput,
  INoteCreateModelContext,
} from "./note.mapper.js";
