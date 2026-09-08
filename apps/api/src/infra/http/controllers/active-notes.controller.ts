import type { Request, Response } from "express";
import { getOrgContext } from "../../../middleware/org-context.js";
import {
  ActiveNoteAnalysisError,
  ActiveNoteApplyError,
  type ActiveNoteAnalyzeAccepted,
  type ActiveNoteAnalysisSnapshot,
  type ActiveNoteApplyResult,
  type ActiveNoteHistoryItem,
} from "@spydr/active-notes";
import {
  activeNoteAnalyzeRequestSchema,
  activeNoteApplyRequestSchema,
  formatActiveNoteRequestError,
} from "../schemas/active-notes.js";
import type { ICommandBus } from "../../../domains/shared/application/index.js";
import { ApplyActiveNoteCommand } from "../../../domains/shared/application/index.js";
import type { IQueryBus } from "../../../domains/shared/application/index.js";
import {
  AnalyzeActiveNoteQuery,
  GetActiveNoteAnalysisQuery,
  ListActiveNotesQuery,
} from "../../../domains/active-notes/queries/index.js";

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ActiveNotesController {
  constructor(
    private readonly queryBus: IQueryBus,
    private readonly commandBus: ICommandBus
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const notes = await this.queryBus.execute<
        ListActiveNotesQuery,
        ActiveNoteHistoryItem[]
      >(new ListActiveNotesQuery(ctx.userId, ctx.orgId));

      res.json(notes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to list active notes" });
    }
  };

  get = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const sessionId = String(req.params.sessionId ?? "").trim();
      if (!SESSION_ID_PATTERN.test(sessionId)) {
        res.status(400).json({ message: "sessionId is invalid" });
        return;
      }

      const result = await this.queryBus.execute<
        GetActiveNoteAnalysisQuery,
        ActiveNoteAnalysisSnapshot
      >(new GetActiveNoteAnalysisQuery(ctx.userId, ctx.orgId, sessionId));

      res.json(result);
    } catch (error) {
      if (error instanceof ActiveNoteAnalysisError) {
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      console.error(error);
      res.status(500).json({ message: "Failed to load active note analysis" });
    }
  };

  analyze = async (req: Request, res: Response): Promise<void> => {
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const parsed = activeNoteAnalyzeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          message: formatActiveNoteRequestError(parsed.error),
        });
        return;
      }

      const result = await this.queryBus.execute<
        AnalyzeActiveNoteQuery,
        ActiveNoteAnalyzeAccepted
      >(
        new AnalyzeActiveNoteQuery(ctx.userId, ctx.orgId, {
          content: parsed.data.content,
        })
      );

      res.status(202).json(result);
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
    const startedAt = Date.now();
    try {
      const ctx = getOrgContext(req, res);
      if (!ctx) return;

      const parsed = activeNoteApplyRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = formatActiveNoteRequestError(parsed.error);
        console.warn("[active-note.apply] invalid request", {
          message,
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        });
        res.status(400).json({ message });
        return;
      }

      console.log("[active-note.apply] http.start", {
        orgId: ctx.orgId,
        operationCount: parsed.data.operations.length,
        selectedCount: parsed.data.operations.filter((op) => op.selected)
          .length,
      });

      const result = await this.commandBus.execute<
        ApplyActiveNoteCommand,
        ActiveNoteApplyResult
      >(
        new ApplyActiveNoteCommand(ctx.userId, ctx.orgId, {
          activeNoteId: parsed.data.activeNoteId ?? undefined,
          content: parsed.data.content,
          projectId: parsed.data.projectId ?? null,
          operations: parsed.data.operations,
        })
      );

      console.log("[active-note.apply] http.ok", {
        applied: result.applied.length,
        failed: result.failed.length,
        partial: result.partial,
        ms: Date.now() - startedAt,
      });
      res.json(result);
    } catch (error) {
      if (error instanceof ActiveNoteApplyError) {
        console.warn("[active-note.apply] http.reject", {
          status: error.statusCode,
          message: error.message,
          ms: Date.now() - startedAt,
        });
        res.status(error.statusCode).json({ message: error.message });
        return;
      }

      console.error("[active-note.apply] http.error", {
        ms: Date.now() - startedAt,
        error,
      });
      res.status(500).json({ message: "Failed to apply active note proposals" });
    }
  };
}
