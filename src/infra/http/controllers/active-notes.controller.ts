import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import {
  ActiveNoteAnalysisError,
  ActiveNoteApplyError,
  activeNoteAnalyzeRequestSchema,
  activeNoteApplyRequestSchema,
  type ActiveNoteAIOutput,
  type ActiveNoteApplyResult,
} from "../../../domain/active-notes/index.js";
import type { ICommandBus } from "../../../domain/cqrs/commands/index.js";
import { ApplyActiveNoteCommand } from "../../../domain/cqrs/commands/index.js";
import type { IQueryBus } from "../../../domain/cqrs/queries/index.js";
import { AnalyzeActiveNoteQuery } from "../../../domain/cqrs/queries/active-notes/index.js";

export class ActiveNotesController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus
  ) {}

  analyze = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const parsed = activeNoteAnalyzeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          message: parsed.error.issues[0]?.message ?? "Invalid request",
        });
        return;
      }

      const result = await this.queryBus.execute<
        AnalyzeActiveNoteQuery,
        ActiveNoteAIOutput
      >(
        new AnalyzeActiveNoteQuery(ctx.userId, ctx.orgId, {
          content: parsed.data.content,
          projectId: parsed.data.projectId ?? null,
        })
      );
      //console.log(result);
      res.json(result);
    } catch (error) {
      if (error instanceof ActiveNoteAnalysisError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to analyze active note" });
    }
  };

  apply = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const parsed = activeNoteApplyRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          message: parsed.error.issues[0]?.message ?? "Invalid request",
        });
        return;
      }

      const result = await this.commandBus.execute<
        ApplyActiveNoteCommand,
        ActiveNoteApplyResult
      >(
        new ApplyActiveNoteCommand(ctx.userId, ctx.orgId, {
          activeNoteId: parsed.data.activeNoteId,
          content: parsed.data.content,
          projectId: parsed.data.projectId ?? null,
          operations: parsed.data.operations,
        })
      );

      res.json(result);
    } catch (error) {
      if (error instanceof ActiveNoteApplyError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to apply active note proposals" });
    }
  };
}
