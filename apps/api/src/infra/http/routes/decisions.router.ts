import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
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
