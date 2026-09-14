import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { ICommandBus } from "../../shared/application/command-bus.js";
import type { IOrganizationRepository } from "../repository.js";
import type { IOrganizationViews, IOrganizationMemberView } from "../views.js";
import type { IPersonRepository } from "../../people/repository.js";
import type { IPersonViews } from "../../people/views.js";
import type { IClerkUserDirectory } from "../clerk-user-directory.js";
import { CreatePersonCommand } from "../../people/commands/create-person.command.js";
import type { OrganizationMemberRole } from "../models/index.js";
import { normalizeInviteEmail } from "../mappers/organization-invite.mapper.js";
import type { PersonNode } from "../../people/models/index.js";

const MEMBER_ROLES: OrganizationMemberRole[] = ["owner", "admin", "member"];

export interface IAddOrganizationMemberInput {
  email: string;
  role?: OrganizationMemberRole;
}

export class AddOrganizationMemberCommand implements ICommand<IOrganizationMemberView> {
  static readonly commandType = "organizations.addMember";
  readonly commandType = AddOrganizationMemberCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly input: IAddOrganizationMemberInput
  ) {}
}

export class AddOrganizationMemberCommandHandler
  implements ICommandHandler<AddOrganizationMemberCommand, IOrganizationMemberView>
{
  readonly commandType = AddOrganizationMemberCommand.commandType;

  constructor(
    private readonly organizations: IOrganizationRepository,
    private readonly organizationViews: IOrganizationViews,
    private readonly people: IPersonRepository,
    private readonly personViews: IPersonViews,
    private readonly clerkUsers: IClerkUserDirectory,
    private readonly commandBus: ICommandBus
  ) {}

  async execute(
    command: AddOrganizationMemberCommand
  ): Promise<IOrganizationMemberView> {
    const org = await this.organizations.get({
      id: command.orgId,
      userId: command.userId,
    });
    if (!org) {
      throw new Error("Not a member of this organization");
    }

    const role = command.input.role ?? "member";
    if (!MEMBER_ROLES.includes(role)) {
      throw new Error("Invalid member role");
    }
    org.assertCanAddMember(role);

    const email = normalizeInviteEmail(command.input.email);
    if (!email || !email.includes("@")) {
      throw new Error("A valid email is required");
    }

    const clerkUser = await this.clerkUsers.findByEmail(email);
    if (!clerkUser) {
      throw new Error("No user found with this email");
    }

    const members = await this.organizationViews.listMembers(command.orgId);
    const alreadyMember = members.some(
      (member) =>
        member.userId === clerkUser.userId ||
        member.person?.email?.trim().toLowerCase() === email
    );
    if (alreadyMember) {
      throw new Error("A member with this email already belongs to the organization");
    }

    const person = await this.resolvePerson(command, org.name, email, clerkUser);

    await this.organizations.save(org, {
      strategy: "addMember",
      context: {
        userId: clerkUser.userId,
        personId: person.id,
        role,
      },
    });

    const member = await this.organizationViews.getMemberByUserId(
      command.orgId,
      clerkUser.userId
    );
    if (!member) {
      throw new Error("Failed to add organization member");
    }
    return member;
  }

  private async resolvePerson(
    command: AddOrganizationMemberCommand,
    organizationName: string,
    email: string,
    clerkUser: { userId: string; fullName: string | null }
  ): Promise<PersonNode> {
    const byClerk = await this.personViews.getByClerkUserId(clerkUser.userId);
    if (byClerk) {
      return byClerk;
    }

    const byEmail = await this.personViews.getByEmailInOrg(command.orgId, email);
    if (byEmail && !byEmail.details?.clerkUserId) {
      byEmail.linkClerkUser(clerkUser.userId);
      if (!byEmail.details?.email) {
        byEmail.setEmail(email);
      }
      return this.people.save(byEmail);
    }

    const fullName =
      clerkUser.fullName?.trim() || email.split("@")[0] || "Member";

    return this.commandBus.execute(
      new CreatePersonCommand(command.userId, command.orgId, {
        fullName,
        email,
        organization: organizationName,
        clerkUserId: clerkUser.userId,
      })
    );
  }
}
