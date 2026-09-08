import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { IPersonCollectionSortRepository } from "../../people/collection-sort-repository.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { IPersonWorkRepository } from "../../people/work-views.js";
import type { PersonCollectionNodeType } from "../../people/collection-sort-repository.js";

export interface IReorderPersonCollectionInput {
  nodeType: PersonCollectionNodeType;
  orderedIds: readonly string[];
}

export class ReorderPersonCollectionCommand implements ICommand<void> {
  static readonly commandType = "people.reorderCollection";
  readonly commandType = ReorderPersonCollectionCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly personId: string,
    readonly input: IReorderPersonCollectionInput
  ) {}
}

export class ReorderPersonCollectionCommandHandler
  implements ICommandHandler<ReorderPersonCollectionCommand, void>
{
  readonly commandType = ReorderPersonCollectionCommand.commandType;

  constructor(
    private readonly people: IPersonRepository,
    private readonly personWork: IPersonWorkRepository,
    private readonly personCollectionSort: IPersonCollectionSortRepository
  ) {}

  async execute(command: ReorderPersonCollectionCommand): Promise<void> {
    const person = await this.people.get({ id: command.personId, orgId: command.orgId });
    if (!person) {
      throw new Error("Person not found");
    }

    const eligibleIds = await this.personWork.getEligibleNodeIds(
      command.orgId,
      command.personId,
      command.input.nodeType
    );

    await this.personCollectionSort.reorderForPerson(
      command.orgId,
      command.personId,
      command.input.nodeType,
      command.input.orderedIds,
      eligibleIds
    );
  }
}
