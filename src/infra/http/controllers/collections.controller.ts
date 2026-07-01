import type { Request, Response } from "express";
import { getAuth } from "@clerk/express";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import { ReorderNodesCommand } from "../../../domain/cqrs/commands/nodes/index.js";
import type { SpydrNodeType } from "../../../domain/models/index.js";

const COLLECTION_NODE_TYPES = new Set<SpydrNodeType>([
  "project",
  "task",
  "idea",
  "note",
  "decision",
  "resource",
  "person",
]);

export class CollectionsController {
  constructor(private readonly commandBus: ICommandBus) {}

  reorder = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = getAuth(req).userId;
      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

    const body = req.body as { nodeType?: string; orderedIds?: unknown };
    const nodeType = body.nodeType;
    const orderedIds = body.orderedIds;

    if (
      typeof nodeType !== "string" ||
      !COLLECTION_NODE_TYPES.has(nodeType as SpydrNodeType)
    ) {
      res.status(400).json({ error: "Invalid nodeType" });
      return;
    }

    if (
      !Array.isArray(orderedIds) ||
      orderedIds.some((id) => typeof id !== "string")
    ) {
      res.status(400).json({ error: "orderedIds must be a string array" });
      return;
    }

    await this.commandBus.execute(
      new ReorderNodesCommand(userId, {
        nodeType: nodeType as SpydrNodeType,
        orderedIds,
      })
    );

    res.status(204).send();
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to reorder collection" });
    }
  };
}
