import type { ICommand, ICommandHandler } from "../command.js";
import type { IPersonCollectionSortRepository } from "../../../interfaces/person-collection-sort-repository.js";
import type { IPersonRepository } from "../../../interfaces/person-repository.js";
import type { IPersonWorkRepository } from "../../../interfaces/person-work-repository.js";
import type { PersonCollectionNodeType } from "../../../interfaces/person-collection-sort-repository.js";

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
    const person = await this.people.findByIdForOrg(
      command.personId,
      command.orgId
    );
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
