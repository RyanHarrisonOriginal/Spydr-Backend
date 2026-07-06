import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ListResourcesQuery } from "../../../domain/cqrs/queries/index.js";
import type { ResourceNode } from "../../../domain/models/resources/index.js";
import { ResourceResponseMapper } from "../mappers/resource-response.mapper.js";

export class ResourcesController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly mapper = new ResourceResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const resources = await this.queryBus.execute<
        ListResourcesQuery,
        ResourceNode[]
      >(new ListResourcesQuery(ctx.userId, ctx.orgId));
      res.json(
        resources.map((resource) => this.mapper.toRepresentation(resource))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list resources" });
    }
  };
}
