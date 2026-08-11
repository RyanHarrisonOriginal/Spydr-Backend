import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ProjectAreasController } from "../controllers/project-areas.controller.js";

export function createProjectAreasRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new ProjectAreasController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.patch("/:areaId", controller.update);
  router.delete("/:areaId", controller.delete);

  return router;
}
