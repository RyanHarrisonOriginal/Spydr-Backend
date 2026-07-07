import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { IdeasController } from "../controllers/ideas.controller.js";

export function createIdeasRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new IdeasController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.delete("/:id", controller.delete);

  return router;
}
