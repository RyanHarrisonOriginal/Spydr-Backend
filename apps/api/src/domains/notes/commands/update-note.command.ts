import type { INoteRepository } from "../repository.js";
import type { INoteListItem, INoteViews } from "../views.js";
import type { INoteUpdateInput } from "../models/index.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export interface IUpdateNoteInput extends INoteUpdateInput {}

export class UpdateNoteCommand implements ICommand<INoteListItem | null> {
  static readonly commandType = "notes.update";
  readonly commandType = UpdateNoteCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly noteId: string,
    readonly input: IUpdateNoteInput
  ) {}
}

export class UpdateNoteCommandHandler
  implements ICommandHandler<UpdateNoteCommand, INoteListItem | null>
{
  readonly commandType = UpdateNoteCommand.commandType;

  constructor(
    private readonly notes: INoteRepository,
    private readonly noteViews: INoteViews
  ) {}

  async execute(command: UpdateNoteCommand): Promise<INoteListItem | null> {
    const existing = await this.notes.get({
      id: command.noteId,
      orgId: command.orgId,
    });
    if (!existing || existing.isDeleted) return null;

    existing.applyUpdate(command.input);
    await this.notes.save(existing);
    return this.noteViews.getListItem(command.orgId, command.noteId);
  }
}
