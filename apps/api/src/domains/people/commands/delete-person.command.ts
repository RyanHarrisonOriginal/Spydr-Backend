import type { IPersonCollectionSortRepository } from "../collection-sort-repository.js";
import type { IPersonRepository } from "../repository.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";

export class DeletePersonCommand implements ICommand<boolean> {
  static readonly commandType = "people.delete";
  readonly commandType = DeletePersonCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly personId: string
  ) {}
}

export class DeletePersonCommandHandler
  implements ICommandHandler<DeletePersonCommand, boolean>
{
  readonly commandType = DeletePersonCommand.commandType;

  constructor(
    private readonly people: IPersonRepository,
    private readonly personCollectionSort: IPersonCollectionSortRepository
  ) {}

  async execute(command: DeletePersonCommand): Promise<boolean> {
    const person = await this.people.get({
      id: command.personId,
      orgId: command.orgId,
    });
    if (!person || person.isDeleted) return false;

    person.softDelete();
    await this.people.save(person, {
      strategy: "clearReferences",
      context: { orgId: command.orgId },
    });
    await this.personCollectionSort.deleteForPerson(
      command.orgId,
      command.personId
    );
    await this.people.delete(person.id);
    return true;
  }
}
