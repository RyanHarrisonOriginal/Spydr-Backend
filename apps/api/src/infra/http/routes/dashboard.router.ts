import { Router } from "express";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import { DashboardController } from "../controllers/dashboard.controller.js";

export function createDashboardRouter(
  queryBus: IQueryBus,
  controller = new DashboardController(queryBus)
): Router {
  const router = Router();

  router.get("/", controller.getWorkspace);

  return router;
}
