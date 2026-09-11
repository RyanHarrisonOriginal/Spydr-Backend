import type { IProjectTemplateRepository } from "../repository.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export class DeleteProjectTemplateCommand implements ICommand<boolean> {
  static readonly commandType = "project-templates.delete";
  readonly commandType = DeleteProjectTemplateCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly templateId: string
  ) {}
}

export class DeleteProjectTemplateCommandHandler
  implements ICommandHandler<DeleteProjectTemplateCommand, boolean>
{
  readonly commandType = DeleteProjectTemplateCommand.commandType;

  constructor(private readonly templates: IProjectTemplateRepository) {}

  async execute(command: DeleteProjectTemplateCommand): Promise<boolean> {
    const template = await this.templates.get({
      id: command.templateId,
      orgId: command.orgId,
    });
    if (!template) return false;
    await this.templates.delete(template.id);
    return true;
  }
}
