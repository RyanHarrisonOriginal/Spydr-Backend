import type { INoteRepository } from "../repository.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export class DeleteNoteCommand implements ICommand<boolean> {
  static readonly commandType = "notes.delete";
  readonly commandType = DeleteNoteCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly noteId: string
  ) {}
}

export class DeleteNoteCommandHandler
  implements ICommandHandler<DeleteNoteCommand, boolean>
{
  readonly commandType = DeleteNoteCommand.commandType;

  constructor(private readonly notes: INoteRepository) {}

  async execute(command: DeleteNoteCommand): Promise<boolean> {
    const note = await this.notes.get({ id: command.noteId, orgId: command.orgId });
    if (!note || note.isDeleted) return false;

    note.softDelete();
    await this.notes.delete(note.id);
    return true;
  }
}
