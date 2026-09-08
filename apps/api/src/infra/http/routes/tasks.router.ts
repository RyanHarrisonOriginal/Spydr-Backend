import { Router } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import { TasksController } from "../controllers/tasks.controller.js";

export function createTasksRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new TasksController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.patch("/:id", controller.update);
  router.post("/:id/complete", controller.complete);
  router.delete("/:id", controller.delete);

  return router;
}
