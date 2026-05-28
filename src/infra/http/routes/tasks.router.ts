import { Router } from "express";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { TasksController } from "../controllers/tasks.controller.js";

export function createTasksRouter(
  queryBus: IQueryBus,
  controller = new TasksController(queryBus)
): Router {
  const router = Router();

  router.get("/", controller.list);

  return router;
}
