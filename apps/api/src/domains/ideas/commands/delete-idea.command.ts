import type { IIdeaRepository } from "../repository.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export class DeleteIdeaCommand implements ICommand<boolean> {
  static readonly commandType = "ideas.delete";
  readonly commandType = DeleteIdeaCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly ideaId: string
  ) {}
}

export class DeleteIdeaCommandHandler
  implements ICommandHandler<DeleteIdeaCommand, boolean>
{
  readonly commandType = DeleteIdeaCommand.commandType;

  constructor(private readonly ideas: IIdeaRepository) {}

  async execute(command: DeleteIdeaCommand): Promise<boolean> {
    const idea = await this.ideas.get({ id: command.ideaId, orgId: command.orgId });
    if (!idea || idea.isDeleted) return false;

    idea.softDelete();
    await this.ideas.delete(idea.id);
    return true;
  }
}
