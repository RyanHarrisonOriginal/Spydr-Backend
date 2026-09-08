import type { IDomainMapper } from "../../shared/mappers/mapper.js";
import type { NoteNode } from "../models/index.js";

export type NoteNodeMapper<TPersistence = unknown> = IDomainMapper<
  TPersistence,
  NoteNode
>;

export { NoteMapper } from "./note.mapper.js";
export type {
  INoteCreateModelInput,
  INoteCreateModelContext,
  INoteUpdateModelInput,
} from "./note.mapper.js";
