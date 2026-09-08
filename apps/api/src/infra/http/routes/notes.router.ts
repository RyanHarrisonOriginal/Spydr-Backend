import { Router } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
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
  router.delete("/:id", controller.delete);

  return router;
}
