import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
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
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const resources = await this.queryBus.execute<
        ListResourcesQuery,
        ResourceNode[]
      >(new ListResourcesQuery(userId));
      res.json(
        resources.map((resource) => this.mapper.toRepresentation(resource))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list resources" });
    }
  };
}
