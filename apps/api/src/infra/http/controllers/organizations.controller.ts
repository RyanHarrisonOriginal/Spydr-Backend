import type { Request, Response } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import {
  CreateOrganizationCommand,
  type ICreateOrganizationCommandInput,
} from "../../../domain/cqrs/commands/organizations/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ListOrganizationsQuery } from "../../../domain/cqrs/queries/organizations/index.js";
import type { Organization } from "../../../domain/models/organizations/index.js";
import { getUserId } from "../../../middleware/org-context.js";
import { OrganizationResponseMapper } from "../mappers/organization-response.mapper.js";

export class OrganizationsController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new OrganizationResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getUserId(req, res);
      if (!userId) return;

      const orgs = await this.queryBus.execute<ListOrganizationsQuery, Organization[]>(
        new ListOrganizationsQuery(userId)
      );

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
}
