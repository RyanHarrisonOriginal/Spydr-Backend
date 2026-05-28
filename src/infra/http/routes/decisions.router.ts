import { Router } from "express";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { DecisionsController } from "../controllers/decisions.controller.js";

export function createDecisionsRouter(
  queryBus: IQueryBus,
  controller = new DecisionsController(queryBus)
): Router {
  const router = Router();

  router.get("/", controller.list);

  return router;
}
