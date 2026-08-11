import type { ICommand, ICommandHandler } from "../command.js";
import type { IPersonRepository } from "../../../interfaces/person-repository.js";
import type { ISpydrNodeRepository } from "../../../interfaces/spydr-node-repository.js";
import { PersonMapper } from "../../../mappers/people/index.js";
import type { PersonNode } from "../../../models/people/index.js";
import type { SpydrNodeStatus, SpydrPriority } from "../../../models/shared.js";
import { nextCollectionSortOrder } from "../../../utils/collection-sort-order.js";

export interface ICreatePersonInput {
  fullName: string;
  body?: string;
  email?: string | null;
  title?: string | null;
  organization?: string | null;
  relationshipContext?: string | null;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

export class CreatePersonCommand implements ICommand<PersonNode> {
  static readonly commandType = "people.create";
  readonly commandType = CreatePersonCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: ICreatePersonInput
  ) {}
}

export class CreatePersonCommandHandler
  implements ICommandHandler<CreatePersonCommand, PersonNode>
{
  readonly commandType = CreatePersonCommand.commandType;

  constructor(
    private readonly people: IPersonRepository,
    private readonly nodes: ISpydrNodeRepository,
    private readonly mapper = new PersonMapper()
  ) {}

  async execute(command: CreatePersonCommand): Promise<PersonNode> {
    const sortOrder = await nextCollectionSortOrder(
      this.nodes,
      command.orgId,
      "person"
    );
    const person = this.mapper.toModel(
      command.userId,
      command.orgId,
      command.input,
      new Date(),
      sortOrder
    );
    return this.people.save(person);
  }
}
