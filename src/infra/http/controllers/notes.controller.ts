import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ListNotesQuery } from "../../../domain/cqrs/queries/index.js";
import type { NoteNode } from "../../../domain/models/notes/index.js";
import { NoteResponseMapper } from "../mappers/note-response.mapper.js";

export class NotesController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly mapper = new NoteResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const notes = await this.queryBus.execute<ListNotesQuery, NoteNode[]>(
        new ListNotesQuery(userId)
      );
      res.json(notes.map((note) => this.mapper.toRepresentation(note)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list notes" });
    }
  };
}
