import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { GetWorkspaceDashboardQuery } from "../../../domain/cqrs/queries/dashboard/index.js";
import type { IWorkspaceDashboard } from "../../../domain/interfaces/workspace-dashboard-repository.js";

export class DashboardController {
  constructor(private readonly queryBus: IQueryBus) {}

  getWorkspace = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const dashboard = await this.queryBus.execute<
        GetWorkspaceDashboardQuery,
        IWorkspaceDashboard
      >(new GetWorkspaceDashboardQuery(userId));

      res.json(dashboard);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to load dashboard" });
    }
  };
}
