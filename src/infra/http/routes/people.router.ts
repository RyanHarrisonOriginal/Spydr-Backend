import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { PeopleController } from "../controllers/people.controller.js";

export function createPeopleRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new PeopleController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:personId", controller.get);
  router.post("/", controller.create);
  router.patch("/:personId", controller.update);
  router.delete("/:personId", controller.delete);

  return router;
}
