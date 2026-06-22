import type { IProjectRepository } from "../../../interfaces/index.js";
import { NoteMapper } from "../../../mappers/notes/index.js";
import type { NoteNode } from "../../../models/notes/index.js";
import {
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../../models/shared.js";
import type { ICommand, ICommandHandler } from "../command.js";

export interface IAddNoteToProjectInput {
  title: string;
  body?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export class AddNoteToProjectCommand implements ICommand<NoteNode | null> {
  static readonly commandType = "projects.notes.add";
  readonly commandType = AddNoteToProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly projectId: string,
    readonly input: IAddNoteToProjectInput
  ) {}
}

export class AddNoteToProjectCommandHandler
  implements ICommandHandler<AddNoteToProjectCommand, NoteNode | null>
{
  readonly commandType = AddNoteToProjectCommand.commandType;

  constructor(
    private readonly projects: IProjectRepository,
    private readonly mapper = new NoteMapper()
  ) {}

  async execute(command: AddNoteToProjectCommand): Promise<NoteNode | null> {
    const project = await this.projects.findByIdForUser(
      command.projectId,
      command.userId
    );
    if (!project) return null;

    const note = this.mapper.toModel(command.input, {
      userId: command.userId,
      area: project.area,
    });
    project.addNote(note);

    await this.projects.save(project);
    return note;
  }
}
