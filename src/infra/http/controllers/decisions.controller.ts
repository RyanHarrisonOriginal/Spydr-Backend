import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import { DeleteDecisionCommand } from "../../../domain/cqrs/commands/decisions/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ListDecisionsQuery } from "../../../domain/cqrs/queries/index.js";
import type { IDecisionListItem } from "../../../domain/interfaces/decision-repository.js";
import { DecisionResponseMapper } from "../mappers/decision-response.mapper.js";

export class DecisionsController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new DecisionResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const decisions = await this.queryBus.execute<
        ListDecisionsQuery,
        IDecisionListItem[]
      >(new ListDecisionsQuery(ctx.userId, ctx.orgId));
      res.json(decisions.map((item) => this.mapper.toListRepresentation(item)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list decisions" });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const deleted = await this.commandBus.execute<DeleteDecisionCommand, boolean>(
        new DeleteDecisionCommand(ctx.userId, ctx.orgId, req.params.id)
      );

      if (!deleted) {
        res.status(404).json({ message: "Decision not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete decision" });
    }
  };
}
