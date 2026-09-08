import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { IPersonUpdateInput, PersonNode } from "../models/index.js";

export type IUpdatePersonInput = IPersonUpdateInput;

export class UpdatePersonCommand implements ICommand<PersonNode | null> {
  static readonly commandType = "people.update";
  readonly commandType = UpdatePersonCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly personId: string,
    readonly input: IUpdatePersonInput
  ) {}
}

export class UpdatePersonCommandHandler
  implements ICommandHandler<UpdatePersonCommand, PersonNode | null>
{
  readonly commandType = UpdatePersonCommand.commandType;

  constructor(private readonly people: IPersonRepository) {}

  async execute(command: UpdatePersonCommand): Promise<PersonNode | null> {
    const existing = await this.people.get({
      id: command.personId,
      orgId: command.orgId,
    });
    if (!existing || existing.isDeleted) return null;

    existing.applyUpdate(command.input);
    return this.people.save(existing);
  }
}
