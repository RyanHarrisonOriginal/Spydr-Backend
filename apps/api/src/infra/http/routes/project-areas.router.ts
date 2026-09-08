import { Router } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
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
