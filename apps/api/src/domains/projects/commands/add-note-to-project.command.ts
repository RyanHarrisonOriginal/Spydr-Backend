import type { IProjectRepository } from "../repository.js";
import type { ISpydrNodeViews } from "../../nodes/views.js";
import { NoteMapper } from "../../notes/mappers/note.mapper.js";
import type { NoteNode } from "../../notes/models/index.js";
import {
  type SpydrNodeStatus,
  type SpydrPriority,
} from "../../shared/models/shared.js";
import { nextCollectionSortOrder } from "../../shared/utils/collection-sort-order.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export interface IAddNoteToProjectInput {
  title?: string;
  body?: string;
  linkToTaskId?: string;
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
    private readonly nodeViews: ISpydrNodeViews,
    private readonly mapper = new NoteMapper()
  ) {}

  async execute(command: AddNoteToProjectCommand): Promise<NoteNode | null> {
    const project = await this.projects.get({
      id: command.projectId,
      orgId: command.orgId,
    });
    if (!project || project.isDeleted) return null;

    const sortOrder = await nextCollectionSortOrder(
      this.nodeViews,
      command.orgId,
      "note"
    );
    const note = this.mapper.toModel(command.input, {
      userId: command.userId,
      orgId: command.orgId,
      area: project.area,
      sortOrder,
    });

    const linkToTaskId = command.input.linkToTaskId?.trim();
    if (linkToTaskId) {
      project.addNoteLinkedToTask(note, linkToTaskId);
    } else {
      project.addNote(note);
    }

    await this.projects.save(project);
    return note;
  }
}
