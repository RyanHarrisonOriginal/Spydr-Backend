import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import {
  UpdateTaskCommand,
  type IUpdateTaskInput,
} from "../../../domain/cqrs/commands/tasks/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { GetTaskQuery, ListTasksQuery } from "../../../domain/cqrs/queries/index.js";
import type { ITaskListItem } from "../../../domain/interfaces/task-repository.js";
import { TaskResponseMapper } from "../mappers/task-response.mapper.js";

export class TasksController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new TaskResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const items = await this.queryBus.execute<ListTasksQuery, ITaskListItem[]>(
        new ListTasksQuery(userId)
      );
      res.json(items.map((item) => this.mapper.toListRepresentation(item)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list tasks" });
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const item = await this.queryBus.execute<GetTaskQuery, ITaskListItem | null>(
        new GetTaskQuery(userId, req.params.id)
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
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const item = await this.commandBus.execute<UpdateTaskCommand, ITaskListItem | null>(
        new UpdateTaskCommand(userId, req.params.id, req.body as IUpdateTaskInput)
      );

      if (!item) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      res.json(this.mapper.toListRepresentation(item));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid")) {
        res.status(400).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to update task" });
    }
  };
}
