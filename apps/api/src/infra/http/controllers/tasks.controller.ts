import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import {
  UpdateTaskCommand,
  CompleteTaskCommand,
  DeleteTaskCommand,
  type IUpdateTaskInput,
} from "../../../domains/tasks/commands/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import { GetTaskQuery, ListTasksQuery } from "../../../domains/shared/application/index.js";
import type { ITaskListItem } from "../../../domains/tasks/views.js";
import { TaskResponseMapper } from "../mappers/task-response.mapper.js";

export class TasksController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new TaskResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const items = await this.queryBus.execute<ListTasksQuery, ITaskListItem[]>(
        new ListTasksQuery(ctx.userId, ctx.orgId)
      );
      res.json(items.map((item) => this.mapper.toListRepresentation(item)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list tasks" });
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const item = await this.queryBus.execute<GetTaskQuery, ITaskListItem | null>(
        new GetTaskQuery(ctx.userId, ctx.orgId, req.params.id)
      );

      if (!item) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      res.json(this.mapper.toListRepresentation(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to load task" });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const item = await this.commandBus.execute<UpdateTaskCommand, ITaskListItem | null>(
        new UpdateTaskCommand(
          ctx.userId,
          ctx.orgId,
          req.params.id,
          req.body as IUpdateTaskInput
        )
      );

      if (!item) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      res.json(this.mapper.toListRepresentation(item));
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.startsWith("Invalid") ||
          error.message === "Person not found")
      ) {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to update task" });
    }
  };

  complete = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const item = await this.commandBus.execute<
        CompleteTaskCommand,
        ITaskListItem | null
      >(new CompleteTaskCommand(ctx.userId, ctx.orgId, req.params.id));

      if (!item) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      res.json(this.mapper.toListRepresentation(item));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const deleted = await this.commandBus.execute<DeleteTaskCommand, boolean>(
        new DeleteTaskCommand(ctx.userId, ctx.orgId, req.params.id)
      );

      if (!deleted) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  };
}
