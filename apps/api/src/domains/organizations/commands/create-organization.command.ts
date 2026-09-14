import type { IOrganizationRepository } from "../repository.js";
import type { Organization } from "../models/index.js";
import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { ICommandBus } from "../../shared/application/command-bus.js";
import { CreatePersonCommand } from "../../people/commands/create-person.command.js";
import type { IPersonViews } from "../../people/views.js";

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
    private readonly personViews: IPersonViews,
    private readonly commandBus: ICommandBus
  ) {}

  async execute(command: CreateOrganizationCommand): Promise<Organization> {
    const existingPerson = await this.personViews.getByClerkUserId(command.userId);

    const org = await this.organizations.save(
      { name: command.input.name },
      {
        strategy: "createForUser",
        context: {
          userId: command.userId,
          personId: existingPerson?.id ?? null,
          role: "owner",
        },
      }
    );

    if (existingPerson) {
      return org;
    }

    const fullName =
      command.input.creator?.fullName?.trim() ||
      command.input.creator?.email?.trim()?.split("@")[0] ||
      "Owner";

    try {
      const person = await this.commandBus.execute(
        new CreatePersonCommand(command.userId, org.id, {
          fullName,
          email: command.input.creator?.email?.trim() || null,
          organization: org.name,
          clerkUserId: command.userId,
        })
      );

      await this.organizations.save(org, {
        strategy: "linkMemberPerson",
        context: { userId: command.userId, personId: person.id },
      });
    } catch (error) {
      console.error(
        `Failed to create person for org owner ${command.userId} in org ${org.id}`,
        error
      );
    }

    return org;
  }
}
