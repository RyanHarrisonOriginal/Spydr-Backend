import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { NotesController } from "../controllers/notes.controller.js";

export function createNotesRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new NotesController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:id", controller.get);
  router.patch("/:id", controller.update);

  return router;
}
