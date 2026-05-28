import { Router } from "express";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { NotesController } from "../controllers/notes.controller.js";

export function createNotesRouter(
  queryBus: IQueryBus,
  controller = new NotesController(queryBus)
): Router {
  const router = Router();

  router.get("/", controller.list);

  return router;
}
