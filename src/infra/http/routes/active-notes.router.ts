import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ActiveNotesController } from "../controllers/active-notes.controller.js";

export function createActiveNotesRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new ActiveNotesController(queryBus, commandBus)
): Router {
  const router = Router();
  router.post("/analyze", controller.analyze);
  router.post("/apply", controller.apply);
  return router;
}
