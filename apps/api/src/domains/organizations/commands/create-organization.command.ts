import type { IOrganizationRepository } from "../repository.js";
import type { Organization } from "../models/index.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { ICommandBus } from "../../shared/application/command-bus.js";
import { CreatePersonCommand } from "../../people/commands/create-person.command.js";

export interface ICreateOrganizationCreatorInput {
  fullName: string;
  email?: string | null;
}

export interface ICreateOrganizationCommandInput {
  name: string;
  creator?: ICreateOrganizationCreatorInput;
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

  constructor(
    private readonly organizations: IOrganizationRepository,
    private readonly commandBus: ICommandBus
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<Organization> {
    const org = await this.organizations.save(
      { name: command.input.name },
      { strategy: "createForUser", context: { userId: command.userId } }
    );

    const fullName = command.input.creator?.fullName?.trim();
    if (fullName) {
      try {
        await this.commandBus.execute(
          new CreatePersonCommand(command.userId, org.id, {
            fullName,
            email: command.input.creator?.email?.trim() || null,
            organization: org.name,
          })
        );
      } catch (error) {
        console.error(
          `Failed to create person for org owner ${command.userId} in org ${org.id}`,
          error
        );
      }
    }

    return org;
  }
}
