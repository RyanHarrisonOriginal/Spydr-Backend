import { Router } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import { TodosController } from "../controllers/todos.controller.js";

export function createTodosRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new TodosController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.add);
  router.delete("/by-task/:taskId", controller.removeByTask);
  router.delete("/:id", controller.remove);

  return router;
}
