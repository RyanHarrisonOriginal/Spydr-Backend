import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { ListTasksQuery } from "../../../domain/cqrs/queries/index.js";
import type { TaskNode } from "../../../domain/models/tasks/index.js";
import { TaskResponseMapper } from "../mappers/task-response.mapper.js";

export class TasksController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly mapper = new TaskResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const tasks = await this.queryBus.execute<ListTasksQuery, TaskNode[]>(
        new ListTasksQuery(userId)
      );
      res.json(tasks.map((task) => this.mapper.toRepresentation(task)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list tasks" });
    }
  };
}
