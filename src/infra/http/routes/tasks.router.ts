import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
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

  return router;
}
