import { Router } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import { DecisionsController } from "../controllers/decisions.controller.js";

export function createDecisionsRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new DecisionsController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.delete("/:id", controller.delete);

  return router;
}
