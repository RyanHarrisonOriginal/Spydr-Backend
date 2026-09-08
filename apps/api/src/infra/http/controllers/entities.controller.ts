import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import { TransformNodeTypeCommand, type ITransformNodeTypeInput } from "../../../domains/node-type-transform/commands/index.js";
import type { INodeTypeTransformResult } from "../../../domains/node-type-transform/index.js";

export class EntitiesController {
  constructor(private readonly commandBus: ICommandBus) {}

  transform = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const result = await this.commandBus.execute<
        TransformNodeTypeCommand,
        INodeTypeTransformResult
      >(
        new TransformNodeTypeCommand(
          ctx.userId,
          ctx.orgId,
          req.body as ITransformNodeTypeInput
        )
      );

      res.json(result);
    } catch (error) {
      if (error instanceof Error) {
        const clientErrors = [
          "Node not found",
          "Target type must differ from the current type",
          "Target project is required when transforming a project into a task",
          "Target project is required when transforming a project into a note",
          "Target project not found",
          "Choose a different project to nest the task under",
          "Choose a different project to nest the note under",
          "Project has linked items that cannot be moved automatically; remove or reassign them before transforming to a task",
          "Project is required when transforming a note into a task",
          "Project is required when transforming an idea into a task",
          "Project not found",
        ];
        if (
          clientErrors.includes(error.message) ||
          error.message.startsWith("Cannot transform") ||
          error.message.startsWith("Node type") ||
          error.message.startsWith("Invalid")
        ) {
          res.status(400).json({ message: error.message });
          return;
        }
      }

      console.error(error);
      res.status(500).json({ message: "Failed to transform node type" });
    }
  };
}
