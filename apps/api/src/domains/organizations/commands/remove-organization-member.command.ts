import type { ICommand, ICommandHandler } from "../../shared/application/command.js";
import type { IOrganizationRepository } from "../repository.js";
import type { IOrganizationViews } from "../views.js";

export class RemoveOrganizationMemberCommand implements ICommand<void> {
  static readonly commandType = "organizations.removeMember";
  readonly commandType = RemoveOrganizationMemberCommand.commandType;

  constructor(
    readonly userId: string,
    readonly orgId: string,
    readonly memberId: string
  ) {}
}

export class RemoveOrganizationMemberCommandHandler
  implements ICommandHandler<RemoveOrganizationMemberCommand, void>
{
  readonly commandType = RemoveOrganizationMemberCommand.commandType;

  constructor(
    private readonly organizations: IOrganizationRepository,
    private readonly organizationViews: IOrganizationViews
  ) {}

  async execute(command: RemoveOrganizationMemberCommand): Promise<void> {
    const org = await this.organizations.get({
      id: command.orgId,
      userId: command.userId,
    });
    if (!org) {
      throw new Error("Not a member of this organization");
    }

    const member = await this.organizationViews.getMemberById(
      command.orgId,
      command.memberId
    );
    if (!member) {
      throw new Error("Member not found");
    }

    const members = await this.organizationViews.listMembers(command.orgId);
    const ownerCount = members.filter((item) => item.role === "owner").length;
    org.assertCanRemoveMember({
      targetRole: member.role,
      ownerCount,
    });

    await this.organizations.save(org, {
      strategy: "removeMember",
      context: { memberId: member.id },
    });
  }
}
