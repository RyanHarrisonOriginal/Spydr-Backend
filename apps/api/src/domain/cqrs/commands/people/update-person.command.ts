import type { ICommand, ICommandHandler } from "../command.js";
import type { IPersonRepository } from "../../../interfaces/person-repository.js";
import { PersonMapper } from "../../../mappers/people/index.js";
import type { PersonNode } from "../../../models/people/index.js";
import type { SpydrNodeStatus, SpydrPriority } from "../../../models/shared.js";

export interface IUpdatePersonInput {
  fullName?: string;
  body?: string;
  email?: string | null;
  title?: string | null;
  organization?: string | null;
  relationshipContext?: string | null;
  status?: SpydrNodeStatus;
  priority?: SpydrPriority;
}

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

  constructor(
    private readonly people: IPersonRepository,
    private readonly mapper = new PersonMapper()
  ) {}

  async execute(command: UpdatePersonCommand): Promise<PersonNode | null> {
    const existing = await this.people.findByIdForOrg(
      command.personId,
      command.orgId
    );
    if (!existing) return null;

    const person = this.mapper.updateToModel(existing, command.input);
    return this.people.save(person);
  }
}
