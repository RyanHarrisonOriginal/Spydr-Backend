import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { OrganizationsController } from "../controllers/organizations.controller.js";

export function createOrganizationsRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus
): Router {
  const router = Router();
  const controller = new OrganizationsController(queryBus, commandBus);

  router.get("/", controller.list);
  router.post("/", controller.create);

  return router;
}
