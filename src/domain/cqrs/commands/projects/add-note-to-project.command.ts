import type { IProjectRepository } from "../../../interfaces/index.js";
import type { ISpydrNodeRepository } from "../../../interfaces/spydr-node-repository.js";
import { NoteMapper } from "../../../mappers/notes/index.js";
import type { NoteNode } from "../../../models/notes/index.js";
import {
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../../models/shared.js";
import { nextCollectionSortOrder } from "../../../utils/collection-sort-order.js";
import type { ICommand, ICommandHandler } from "../command.js";

export interface IAddNoteToProjectInput {
  title?: string;
  body?: string;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export class AddNoteToProjectCommand implements ICommand<NoteNode | null> {
  static readonly commandType = "projects.notes.add";
  readonly commandType = AddNoteToProjectCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
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
    private readonly nodes: ISpydrNodeRepository,
    private readonly mapper = new NoteMapper()
  ) {}

  async execute(command: AddNoteToProjectCommand): Promise<NoteNode | null> {
    const project = await this.projects.findByIdForOrg(
      command.projectId,
      command.orgId
    );
    if (!project) return null;

    const sortOrder = await nextCollectionSortOrder(
      this.nodes,
      command.orgId,
      "note"
    );
    const note = this.mapper.toModel(command.input, {
      userId: command.userId,
      orgId: command.orgId,
      area: project.area,
      sortOrder,
    });
    project.addNote(note);

    await this.projects.save(project);
    return note;
  }
}
