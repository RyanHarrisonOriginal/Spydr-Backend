import type { IProjectRepository } from "../repository.js";
import type { ProjectNode } from "../models/index.js";
import type {
  IUpdateProjectChildInput,
  ProjectChildKind,
} from "../repository.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export type { IUpdateProjectChildInput, ProjectChildKind };

export class UpdateProjectChildCommand implements ICommand<ProjectNode | null> {
  static readonly commandType = "projects.children.update";
  readonly commandType = UpdateProjectChildCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly childId: string,
    readonly kind: ProjectChildKind,
    readonly input: IUpdateProjectChildInput
  ) {}
}

export class UpdateProjectChildCommandHandler
  implements ICommandHandler<UpdateProjectChildCommand, ProjectNode | null>
{
  readonly commandType = UpdateProjectChildCommand.commandType;

  constructor(private readonly projects: IProjectRepository) {}

  async execute(
    command: UpdateProjectChildCommand
  ): Promise<ProjectNode | null> {
    const project = await this.projects.get({
      id: command.projectId,
      orgId: command.orgId,
    });
    if (!project || project.isDeleted) return null;

    project.updateChild(command.kind, command.childId, command.input);
    return this.projects.save(project, {
      strategy: "updateChild",
      context: {
        orgId: command.orgId,
        projectId: command.projectId,
        childId: command.childId,
        kind: command.kind,
        input: command.input,
      },
    });
  }
}

export class DeleteProjectChildCommand implements ICommand<ProjectNode | null> {
  static readonly commandType = "projects.children.delete";
  readonly commandType = DeleteProjectChildCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly childId: string,
    readonly kind: ProjectChildKind
  ) {}
}

export class DeleteProjectChildCommandHandler
  implements ICommandHandler<DeleteProjectChildCommand, ProjectNode | null>
{
  readonly commandType = DeleteProjectChildCommand.commandType;

  constructor(private readonly projects: IProjectRepository) {}

  async execute(
    command: DeleteProjectChildCommand
  ): Promise<ProjectNode | null> {
    const project = await this.projects.get({
      id: command.projectId,
      orgId: command.orgId,
    });
    if (!project || project.isDeleted) return null;

    project.softDeleteChild(command.kind, command.childId);
    return this.projects.save(project, {
      strategy: "softDeleteChild",
      context: {
        orgId: command.orgId,
        projectId: command.projectId,
        childId: command.childId,
        kind: command.kind,
      },
    });
  }
}

export class RestoreProjectChildCommand implements ICommand<ProjectNode | null> {
  static readonly commandType = "projects.children.restore";
  readonly commandType = RestoreProjectChildCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly projectId: string,
    readonly childId: string,
    readonly kind: ProjectChildKind
  ) {}
}

export class RestoreProjectChildCommandHandler
  implements ICommandHandler<RestoreProjectChildCommand, ProjectNode | null>
{
  readonly commandType = RestoreProjectChildCommand.commandType;

  constructor(private readonly projects: IProjectRepository) {}

  async execute(
    command: RestoreProjectChildCommand
  ): Promise<ProjectNode | null> {
    const project = await this.projects.get({
      id: command.projectId,
      orgId: command.orgId,
      includeDeleted: true,
    });
    if (!project) return null;

    project.restoreChild(command.kind, command.childId);
    return this.projects.save(project, {
      strategy: "restoreChild",
      context: {
        orgId: command.orgId,
        projectId: command.projectId,
        childId: command.childId,
        kind: command.kind,
      },
    });
  }
}
