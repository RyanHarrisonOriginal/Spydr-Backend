import type { IProjectTemplateRepository } from "../repository.js";
import {
  ProjectTemplateMapper,
  type ICreateProjectTemplateInput,
} from "../mappers/index.js";
import type { ProjectTemplate } from "../models/index.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export class CreateProjectTemplateCommand
  implements ICommand<ProjectTemplate>
{
  static readonly commandType = "project-templates.create";
  readonly commandType = CreateProjectTemplateCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: ICreateProjectTemplateInput
  ) {}
}

export class CreateProjectTemplateCommandHandler
  implements ICommandHandler<CreateProjectTemplateCommand, ProjectTemplate>
{
  readonly commandType = CreateProjectTemplateCommand.commandType;

  constructor(
    private readonly templates: IProjectTemplateRepository,
    private readonly mapper = new ProjectTemplateMapper()
  ) {}

  async execute(
    command: CreateProjectTemplateCommand
  ): Promise<ProjectTemplate> {
    const template = this.mapper.toModel(
      command.userId,
      command.orgId,
      command.input
    );
    return this.templates.save(template);
  }
}
