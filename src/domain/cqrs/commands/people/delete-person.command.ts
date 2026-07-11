import type { IPersonCollectionSortRepository } from "../../../interfaces/person-collection-sort-repository.js";
import type { IPersonRepository } from "../../../interfaces/person-repository.js";
import type { ICommand, ICommandHandler } from "../command.js";

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
    const person = await this.people.findByIdForOrg(
      command.personId,
      command.orgId
    );
    if (!person) return false;

    await this.people.clearPersonReferences(command.orgId, command.personId);
    await this.personCollectionSort.deleteForPerson(
      command.orgId,
      command.personId
    );
    await this.people.delete(person.id);
    return true;
  }
}
