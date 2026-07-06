import type { IOrganizationRepository } from "../../../interfaces/organization-repository.js";
import type { Organization } from "../../../models/organizations/index.js";
import type { ICommand, ICommandHandler } from "../command.js";

export interface ICreateOrganizationCommandInput {
  name: string;
}

export class CreateOrganizationCommand implements ICommand<Organization> {
  static readonly commandType = "organizations.create";
  readonly commandType = CreateOrganizationCommand.commandType;

  constructor(
    readonly userId: string,
    readonly input: ICreateOrganizationCommandInput
  ) {}
}

export class CreateOrganizationCommandHandler
  implements ICommandHandler<CreateOrganizationCommand, Organization>
{
  readonly commandType = CreateOrganizationCommand.commandType;

  constructor(private readonly organizations: IOrganizationRepository) {}

  async execute(command: CreateOrganizationCommand): Promise<Organization> {
    return this.organizations.createForUser(command.userId, command.input);
  }
}
