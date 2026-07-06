import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { GetWorkspaceDashboardQuery } from "../../../domain/cqrs/queries/dashboard/index.js";
import type { IWorkspaceDashboard } from "../../../domain/interfaces/workspace-dashboard-repository.js";

export class DashboardController {
  constructor(private readonly queryBus: IQueryBus) {}

  getWorkspace = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const dashboard = await this.queryBus.execute<
        GetWorkspaceDashboardQuery,
        IWorkspaceDashboard
      >(new GetWorkspaceDashboardQuery(ctx.userId, ctx.orgId));

      res.json(dashboard);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to load dashboard" });
    }
  };
}
