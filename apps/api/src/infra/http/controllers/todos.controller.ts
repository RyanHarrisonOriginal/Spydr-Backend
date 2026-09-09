import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import {
  AddTaskToTodoCommand,
  RemoveTodoItemCommand,
  RemoveTodoItemByTaskCommand,
} from "../../../domains/todos/commands/index.js";
import { ListTodoItemsQuery } from "../../../domains/todos/queries/index.js";
import type { ITodoListItem } from "../../../domains/todos/views.js";
import { TodoItemResponseMapper } from "../mappers/todo-item-response.mapper.js";

export class TodosController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus,
    private readonly mapper = new TodoItemResponseMapper()
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const items = await this.queryBus.execute<ListTodoItemsQuery, ITodoListItem[]>(
        new ListTodoItemsQuery(ctx.userId, ctx.orgId)
      );
      res.json(items.map((item) => this.mapper.toRepresentation(item)));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list todo items" });
    }
  };

  add = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const taskId =
        typeof req.body?.taskId === "string" ? req.body.taskId.trim() : "";
      if (!taskId) {
        res.status(400).json({ message: "taskId is required" });
        return;
      }

      const item = await this.commandBus.execute<
        AddTaskToTodoCommand,
        ITodoListItem | null
      >(
        new AddTaskToTodoCommand(ctx.userId, ctx.orgId, {
          taskNodeId: taskId,
          source: req.body?.source,
        })
      );

      if (!item) {
        res.status(404).json({ message: "Task not found" });
        return;
      }

      res.status(201).json(this.mapper.toRepresentation(item));
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Invalid")) {
        res.status(400).json({ message: error.message });
        return;
      }
      console.error(error);
      res.status(500).json({ message: "Failed to add task to todo" });
    }
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const removed = await this.commandBus.execute<RemoveTodoItemCommand, boolean>(
        new RemoveTodoItemCommand(ctx.userId, ctx.orgId, req.params.id)
      );

      if (!removed) {
        res.status(404).json({ message: "Todo item not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to remove todo item" });
    }
  };

  removeByTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const removed = await this.commandBus.execute<
        RemoveTodoItemByTaskCommand,
        boolean
      >(
        new RemoveTodoItemByTaskCommand(
          ctx.userId,
          ctx.orgId,
          req.params.taskId
        )
      );

      if (!removed) {
        res.status(404).json({ message: "Todo item not found" });
        return;
      }

      res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to remove todo item" });
    }
  };
}
