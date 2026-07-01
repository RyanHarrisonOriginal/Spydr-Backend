import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import { CollectionsController } from "../controllers/collections.controller.js";

export function createCollectionsRouter(commandBus: ICommandBus): Router {
  const router = Router();
  const controller = new CollectionsController(commandBus);

  router.post("/reorder", controller.reorder);

  return router;
}
