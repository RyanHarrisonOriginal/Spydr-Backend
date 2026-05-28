import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ListDecisionsQuery } from "../../../domain/cqrs/queries/index.js";
import type { DecisionNode } from "../../../domain/models/decisions/index.js";
import { DecisionResponseMapper } from "../mappers/decision-response.mapper.js";

export class DecisionsController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly mapper = new DecisionResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const decisions = await this.queryBus.execute<
        ListDecisionsQuery,
        DecisionNode[]
      >(new ListDecisionsQuery(userId));
      res.json(
        decisions.map((decision) => this.mapper.toRepresentation(decision))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list decisions" });
    }
  };
}
