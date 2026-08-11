import { Router } from "express";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ResourcesController } from "../controllers/resources.controller.js";

export function createResourcesRouter(
  queryBus: IQueryBus,
  controller = new ResourcesController(queryBus)
): Router {
  const router = Router();

  router.get("/", controller.list);

  return router;
}
