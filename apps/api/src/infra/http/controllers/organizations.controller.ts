import type { Request, Response } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import {
  AcceptOrganizationInviteCommand,
  AddOrganizationMemberCommand,
  CreateOrganizationCommand,
  InviteOrganizationMemberCommand,
  RemoveOrganizationMemberCommand,
  RevokeOrganizationInviteCommand,
  type IAddOrganizationMemberInput,
  type ICreateOrganizationCommandInput,
  type IInviteOrganizationMemberInput,
} from "../../../domains/organizations/commands/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import {
  GetOrganizationInviteQuery,
  ListMyOrganizationInvitesQuery,
  ListOrganizationInvitesQuery,
  ListOrganizationMembersQuery,
  ListOrganizationsQuery,
} from "../../../domains/organizations/queries/index.js";
import { SyncPersonFromClerkCommand } from "../../../domains/people/commands/index.js";
import type { Organization } from "../../../domains/organizations/models/index.js";
import type { OrganizationInvite } from "../../../domains/organizations/models/organization-invite.js";
import type { IOrganizationMemberView } from "../../../domains/organizations/views.js";
import { getUserId } from "../../../middleware/org-context.js";
import { OrganizationResponseMapper } from "../mappers/organization-response.mapper.js";
import {
  OrganizationInviteResponseMapper,
  OrganizationMemberResponseMapper,
} from "../mappers/organization-invite-response.mapper.js";
import {
  getClerkUserEmails,
  getClerkUserFullName,
} from "../../clerk/clerk-users.js";

function httpStatusForInviteError(message: string): number {
  if (
    message === "Not a member of this organization" ||
    message === "You do not have permission to invite this role" ||
    message === "You do not have permission to revoke invites" ||
    message === "You do not have permission to list invites" ||
    message === "You do not have permission to add members" ||
    message === "You do not have permission to assign this role" ||
    message === "You do not have permission to remove members" ||
    message === "You do not have permission to remove an owner"
  ) {
    return 403;
  }
  if (
    message === "Invite not found" ||
    message === "Organization not found" ||
    message === "Member not found" ||
    message === "No user found with this email"
  ) {
    return 404;
  }
  if (
    message === "A pending invite already exists for this email" ||
    message === "A member with this email already belongs to the organization" ||
    message === "Invite has already been accepted" ||
    message === "Cannot remove the last owner"
  ) {
    return 409;
  }
  return 400;
}

export class OrganizationsController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new OrganizationResponseMapper(),
    private readonly inviteMapper = new OrganizationInviteResponseMapper(),
    private readonly memberMapper = new OrganizationMemberResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      const orgsPromise = this.queryBus.execute<
        ListOrganizationsQuery,
        Organization[]
      >(new ListOrganizationsQuery(userId));

      try {
        await this.commandBus.execute(new SyncPersonFromClerkCommand(userId));
      } catch (error) {
        console.error("Failed to sync person from Clerk", error);
      }

      const orgs = await orgsPromise;

      res.json(orgs.map((org) => this.mapper.toRepresentation(org)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list organizations" });
    }
  };

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      const input = req.body as ICreateOrganizationCommandInput;
      const org = await this.commandBus.execute<
        CreateOrganizationCommand,
        Organization
      >(new CreateOrganizationCommand(userId, input));

      res.status(201).json(this.mapper.toRepresentation(org));
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Failed to create organization";
      res.status(400).json({ message });
    }
  };

  listMembers = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      const members = await this.queryBus.execute<
        ListOrganizationMembersQuery,
        IOrganizationMemberView[]
      >(new ListOrganizationMembersQuery(userId, req.params.orgId));

      res.json(members.map((member) => this.memberMapper.toRepresentation(member)));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to list members";
      res.status(httpStatusForInviteError(message)).json({ message });
    }
  };

  listInvites = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      const invites = await this.queryBus.execute<
        ListOrganizationInvitesQuery,
        OrganizationInvite[]
      >(new ListOrganizationInvitesQuery(userId, req.params.orgId));

      res.json(invites.map((invite) => this.inviteMapper.toRepresentation(invite)));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to list invites";
      res.status(httpStatusForInviteError(message)).json({ message });
    }
  };

  inviteMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      const invite = await this.commandBus.execute<
        InviteOrganizationMemberCommand,
        OrganizationInvite
      >(
        new InviteOrganizationMemberCommand(
          userId,
          req.params.orgId,
          req.body as IInviteOrganizationMemberInput
        )
      );

      res.status(201).json(this.inviteMapper.toRepresentation(invite));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to send invite";
      res.status(httpStatusForInviteError(message)).json({ message });
    }
  };

  revokeInvite = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      await this.commandBus.execute(
        new RevokeOrganizationInviteCommand(
          userId,
          req.params.orgId,
          req.params.inviteId
        )
      );

      res.status(204).send();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke invite";
      res.status(httpStatusForInviteError(message)).json({ message });
    }
  };

  addMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      const member = await this.commandBus.execute<
        AddOrganizationMemberCommand,
        IOrganizationMemberView
      >(
        new AddOrganizationMemberCommand(
          userId,
          req.params.orgId,
          req.body as IAddOrganizationMemberInput
        )
      );

      res.status(201).json(this.memberMapper.toRepresentation(member));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add member";
      res.status(httpStatusForInviteError(message)).json({ message });
    }
  };

  removeMember = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      await this.commandBus.execute(
        new RemoveOrganizationMemberCommand(
          userId,
          req.params.orgId,
          req.params.memberId
        )
      );

      res.status(204).send();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove member";
      res.status(httpStatusForInviteError(message)).json({ message });
    }
  };

  listMyInvites = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      const emails = await getClerkUserEmails(userId);
      const invites = await this.queryBus.execute<
        ListMyOrganizationInvitesQuery,
        OrganizationInvite[]
      >(new ListMyOrganizationInvitesQuery(emails));

      res.json(
        invites.map((invite) =>
          this.inviteMapper.toRepresentation(invite, { includeToken: true })
        )
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list invites" });
    }
  };

  getInvite = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      const invite = await this.queryBus.execute<
        GetOrganizationInviteQuery,
        OrganizationInvite | null
      >(new GetOrganizationInviteQuery(req.params.token));

      if (!invite) {
        res.status(404).json({ message: "Invite not found" });
        return;
      }

      res.json(this.inviteMapper.toRepresentation(invite, { includeToken: true }));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to get invite" });
    }
  };

  acceptInvite = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      const [emails, fullName] = await Promise.all([
        getClerkUserEmails(userId),
        getClerkUserFullName(userId),
      ]);

      const invite = await this.commandBus.execute<
        AcceptOrganizationInviteCommand,
        OrganizationInvite
      >(
        new AcceptOrganizationInviteCommand(
          userId,
          req.params.token,
          emails,
          fullName
        )
      );

      res.json(this.inviteMapper.toRepresentation(invite));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to accept invite";
      res.status(httpStatusForInviteError(message)).json({ message });
    }
  };
}
