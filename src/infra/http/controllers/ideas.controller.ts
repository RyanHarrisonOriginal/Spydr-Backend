import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ListIdeasQuery } from "../../../domain/cqrs/queries/index.js";
import type { IdeaNode } from "../../../domain/models/ideas/index.js";
import { IdeaResponseMapper } from "../mappers/idea-response.mapper.js";

export class IdeasController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly mapper = new IdeaResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const ideas = await this.queryBus.execute<ListIdeasQuery, IdeaNode[]>(
        new ListIdeasQuery(ctx.userId, ctx.orgId)
      );
      if (process.env.NODE_ENV !== "production") {
        console.log(`[ideas.list] org=${ctx.orgId} count=${ideas.length}`);
      }
      res.json(ideas.map((idea) => this.mapper.toRepresentation(idea)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list ideas" });
    }
  };
}
