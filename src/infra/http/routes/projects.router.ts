import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ProjectsController } from "../controllers/projects.controller.js";

export function createProjectsRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new ProjectsController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:projectId", controller.get);
  router.post("/", controller.create);
  router.patch("/:projectId", controller.update);
  router.post("/:projectId/tasks", controller.createTask);

  return router;
}
