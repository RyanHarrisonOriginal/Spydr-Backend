import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
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
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const decisions = await this.queryBus.execute<
        ListDecisionsQuery,
        DecisionNode[]
      >(new ListDecisionsQuery(ctx.userId, ctx.orgId));
      res.json(
        decisions.map((decision) => this.mapper.toRepresentation(decision))
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list decisions" });
    }
  };
}
