import { Router } from "express";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { IdeasController } from "../controllers/ideas.controller.js";

export function createIdeasRouter(
  queryBus: IQueryBus,
  controller = new IdeasController(queryBus)
): Router {
  const router = Router();

  router.get("/", controller.list);

  return router;
}
