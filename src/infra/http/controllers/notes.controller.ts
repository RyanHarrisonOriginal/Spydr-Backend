import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import {
  UpdateNoteCommand,
  type IUpdateNoteInput,
} from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { GetNoteQuery, ListNotesQuery } from "../../../domain/cqrs/queries/index.js";
import type { INoteListItem } from "../../../domain/interfaces/note-repository.js";
import { NoteResponseMapper } from "../mappers/note-response.mapper.js";

export class NotesController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new NoteResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const notes = await this.queryBus.execute<ListNotesQuery, INoteListItem[]>(
        new ListNotesQuery(ctx.userId, ctx.orgId)
      );
      res.json(notes.map((note) => this.mapper.toListRepresentation(note)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list notes" });
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const item = await this.queryBus.execute<GetNoteQuery, INoteListItem | null>(
        new GetNoteQuery(ctx.userId, ctx.orgId, req.params.id)
      );

      if (!item) {
        res.status(404).json({ message: "Note not found" });
        return;
      }

      res.json(this.mapper.toListRepresentation(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to load note" });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const item = await this.commandBus.execute<UpdateNoteCommand, INoteListItem | null>(
        new UpdateNoteCommand(
          ctx.userId,
          ctx.orgId,
          req.params.id,
          req.body as IUpdateNoteInput
        )
      );

      if (!item) {
        res.status(404).json({ message: "Note not found" });
        return;
      }

      res.json(this.mapper.toListRepresentation(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update note" });
    }
  };
}
