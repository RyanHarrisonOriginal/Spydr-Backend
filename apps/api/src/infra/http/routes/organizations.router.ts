import { Router } from "express";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import { OrganizationsController } from "../controllers/organizations.controller.js";

export function createOrganizationsRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus
): Router {
  const router = Router();
  const controller = new OrganizationsController(queryBus, commandBus);

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:orgId/members", controller.listMembers);
  router.post("/:orgId/members", controller.addMember);
  router.delete("/:orgId/members/:memberId", controller.removeMember);
  router.get("/:orgId/invites", controller.listInvites);
  router.post("/:orgId/invites", controller.inviteMember);
  router.delete("/:orgId/invites/:inviteId", controller.revokeInvite);

  return router;
}

export function createInvitesRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus
): Router {
  const router = Router();
  const controller = new OrganizationsController(queryBus, commandBus);

  router.get("/", controller.listMyInvites);
  router.get("/:token", controller.getInvite);
  router.post("/:token/accept", controller.acceptInvite);

  return router;
}
