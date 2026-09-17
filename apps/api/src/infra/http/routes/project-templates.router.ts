import { Router } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import { ProjectTemplatesController } from "../controllers/project-templates.controller.js";

export function createProjectTemplatesRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new ProjectTemplatesController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.post("/from-project", controller.createFromProject);
  router.get("/:templateId", controller.get);
  router.get("/:templateId/spawned-projects", controller.listSpawnedProjects);
  router.patch("/:templateId", controller.update);
  router.delete("/:templateId", controller.delete);
  router.post("/:templateId/invoke", controller.invoke);

  return router;
}
