import { Router } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import { PeopleController } from "../controllers/people.controller.js";

export function createPeopleRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new PeopleController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:personId/work", controller.getWork);
  router.post("/:personId/collections/reorder", controller.reorderCollection);
  router.get("/:personId", controller.get);
  router.post("/", controller.create);
  router.patch("/:personId", controller.update);
  router.delete("/:personId", controller.delete);

  return router;
}
