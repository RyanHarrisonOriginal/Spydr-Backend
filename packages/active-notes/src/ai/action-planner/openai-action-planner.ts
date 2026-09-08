import type {
  ISegmentActionPlanner,
  PlanSegmentActionInput,
  SegmentActionPlan,
} from "../../domain/index.js";
import { ACTIVE_NOTE_ACTION_PLANNER_RESPONSE_SCHEMA } from "./json-schema.js";
import {
  ACTIVE_NOTE_ACTION_PLANNER_PROMPT_VERSION,
  ACTIVE_NOTE_ACTION_PLANNER_SYSTEM_PROMPT,
} from "./prompt.js";
import { buildSegmentActionPlannerUserInput } from "./build-prompt-input.js";
import { parseSegmentActionPlanOutput } from "./parse.js";
import type { OpenAIJsonClient } from "../openai-json-client.js";

export class OpenAISegmentActionPlanner implements ISegmentActionPlanner {
  constructor(private readonly client: OpenAIJsonClient) {}

  async plan(input: PlanSegmentActionInput): Promise<SegmentActionPlan> {
    return this.client.runAnalysisStep(
      ACTIVE_NOTE_ACTION_PLANNER_PROMPT_VERSION,
      "action planner",
      async () => {
        const parsedJson = await this.client.runJsonSchemaPrompt({
          systemPrompt: ACTIVE_NOTE_ACTION_PLANNER_SYSTEM_PROMPT,
          userContent: buildSegmentActionPlannerUserInput(input),
          jsonSchema: ACTIVE_NOTE_ACTION_PLANNER_RESPONSE_SCHEMA,
        });

        return parseSegmentActionPlanOutput(
          normalizeActionPlannerResponse(parsedJson),
          input.routedSegment,
          input.projectContext
        );
      }
    );
  }
}

function normalizeActionPlannerResponse(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || !("action" in raw)) {
    return raw;
  }

  const record = raw as Record<string, unknown>;
  const action = record.action;
  if (!action || typeof action !== "object") {
    return raw;
  }

  const actionRecord = action as Record<string, unknown>;
  let actionType = String(actionRecord.type ?? "");
  const originalText = nullableString(record.originalText);
  const targetTaskId = nullableString(actionRecord.targetTaskId);
  const targetTaskTitle = nullableString(actionRecord.targetTaskTitle);
  const rawPayload =
    actionRecord.payload && typeof actionRecord.payload === "object"
      ? (actionRecord.payload as Record<string, unknown>)
      : undefined;

  if (actionType === "attach_note_to_project") {
    actionType = "create_note";
  }

  const normalizedAction: Record<string, unknown> = {
    type: actionType,
    confidence: actionRecord.confidence,
    reason: actionRecord.reason,
  };

  if (
    (actionType === "attach_note_to_task" ||
      actionType === "use_existing_task") &&
    targetTaskId &&
    targetTaskTitle
  ) {
    normalizedAction.targetTaskId = targetTaskId;
    normalizedAction.targetTaskTitle = targetTaskTitle;
  } else if (
    actionType === "attach_note_to_task" ||
    actionType === "use_existing_task"
  ) {
    actionType = "create_note";
    normalizedAction.type = "create_note";
  }

  const payload = normalizeActionPayload(actionType, rawPayload, originalText);
  if (payload) {
    normalizedAction.payload = payload;
  }

  return {
    ...record,
    action: normalizedAction,
  };
}

function nullableString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeActionPayload(
  actionType: string,
  payload: Record<string, unknown> | undefined,
  originalText: string | undefined
): Record<string, unknown> | undefined {
  const title = nullableString(payload?.title);
  const description = nullableString(payload?.description);
  const subject = nullableString(payload?.subject);
  const content = nullableString(payload?.content);
  const rationale = nullableString(payload?.rationale);

  switch (actionType) {
    case "create_task":
      if (!title) {
        return undefined;
      }
      return { title, description: description ?? null };
    case "create_note":
    case "attach_note_to_task":
      return {
        subject: subject ?? title ?? "Project Update",
        content: content ?? description ?? originalText ?? "",
      };
    case "create_decision":
      if (!title) {
        return undefined;
      }
      return { title, rationale: rationale ?? null };
    case "create_idea":
      if (!title) {
        return undefined;
      }
      return { title, description: description ?? null };
    case "use_existing_task":
      return undefined;
    default:
      return undefined;
  }
}
