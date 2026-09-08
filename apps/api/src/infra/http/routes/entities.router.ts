import { Router } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import { EntitiesController } from "../controllers/entities.controller.js";

export function createEntitiesRouter(
  commandBus: ICommandBus,
  controller = new EntitiesController(commandBus)
): Router {
  const router = Router();

  router.post("/transform", controller.transform);

  return router;
}
