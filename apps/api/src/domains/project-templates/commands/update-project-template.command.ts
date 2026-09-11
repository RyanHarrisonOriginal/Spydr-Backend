import type { IProjectTemplateRepository } from "../repository.js";
import type {
  IProjectTemplateUpdateInput,
  ProjectTemplate,
} from "../models/index.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export class UpdateProjectTemplateCommand implements ICommand<ProjectTemplate> {
  static readonly commandType = "project-templates.update";
  readonly commandType = UpdateProjectTemplateCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly templateId: string,
    readonly input: IProjectTemplateUpdateInput
  ) {}
}

export class UpdateProjectTemplateCommandHandler
  implements ICommandHandler<UpdateProjectTemplateCommand, ProjectTemplate>
{
  readonly commandType = UpdateProjectTemplateCommand.commandType;

  constructor(private readonly templates: IProjectTemplateRepository) {}

  async execute(command: UpdateProjectTemplateCommand): Promise<ProjectTemplate> {
    const template = await this.templates.get({
      id: command.templateId,
      orgId: command.orgId,
    });
    if (!template) {
      throw new Error("Project template not found");
    }

    const keys = Object.keys(command.input);
    if (keys.length === 0) {
      throw new Error("Nothing to update");
    }

    template.applyUpdate(command.input);
    return this.templates.save(template);
  }
}
