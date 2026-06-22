import { Router } from "express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ProjectsController } from "../controllers/projects.controller.js";

export function createProjectsRouter(
  queryBus: IQueryBus,
  commandBus: ICommandBus,
  controller = new ProjectsController(queryBus, commandBus)
): Router {
  const router = Router();

  router.get("/", controller.list);
  router.get("/:projectId", controller.get);
  router.post("/", controller.create);
  router.patch("/:projectId", controller.update);
  router.post("/:projectId/tasks", controller.createTask);
  router.patch("/:projectId/tasks/:childId", controller.updateTask);
  router.delete("/:projectId/tasks/:childId", controller.deleteTask);
  router.post("/:projectId/tasks/:childId/restore", controller.restoreTask);
  router.post("/:projectId/notes", controller.createNote);
  router.patch("/:projectId/notes/:childId", controller.updateNote);
  router.delete("/:projectId/notes/:childId", controller.deleteNote);
  router.post("/:projectId/notes/:childId/restore", controller.restoreNote);
  router.post("/:projectId/decisions", controller.createDecision);
  router.patch("/:projectId/decisions/:childId", controller.updateDecision);
  router.delete("/:projectId/decisions/:childId", controller.deleteDecision);
  router.post("/:projectId/decisions/:childId/restore", controller.restoreDecision);
  router.post("/:projectId/ideas", controller.createIdea);
  router.patch("/:projectId/ideas/:childId", controller.updateIdea);
  router.delete("/:projectId/ideas/:childId", controller.deleteIdea);
  router.post("/:projectId/ideas/:childId/restore", controller.restoreIdea);
  router.patch("/:projectId/resources/:childId", controller.updateResource);
  router.delete("/:projectId/resources/:childId", controller.deleteResource);
  router.post("/:projectId/resources/:childId/restore", controller.restoreResource);

  return router;
}
