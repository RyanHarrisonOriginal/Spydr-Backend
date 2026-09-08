import { Router } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import { ActiveNotesController } from "../controllers/active-notes.controller.js";

export function createActiveNotesRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new ActiveNotesController(queryBus, commandBus)
): Router {
  const router = Router();
  router.get("/", controller.list);
  router.get("/:sessionId", controller.get);
  router.post("/analyze", controller.analyze);
  router.post("/apply", controller.apply);
  return router;
}
