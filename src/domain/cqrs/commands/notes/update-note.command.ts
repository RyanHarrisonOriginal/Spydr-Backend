import type { INoteListItem, INoteRepository } from "../../../interfaces/index.js";
import type { INoteUpdateModelInput } from "../../../mappers/notes/note.mapper.js";
import type { ICommand, ICommandHandler } from "../command.js";

export interface IUpdateNoteInput extends INoteUpdateModelInput {}

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

  constructor(private readonly notes: INoteRepository) {}

  async execute(command: UpdateNoteCommand): Promise<INoteListItem | null> {
    const updated = await this.notes.updateForOrg(
      command.orgId,
      command.noteId,
      command.input
    );

    if (!updated) return null;

    return this.notes.getListItemForOrg(command.orgId, command.noteId);
  }
}
