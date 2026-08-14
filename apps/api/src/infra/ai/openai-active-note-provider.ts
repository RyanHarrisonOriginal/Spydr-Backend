import OpenAI from "openai";
import {
  ACTIVE_NOTE_ACTION_PLANNER_PROMPT_VERSION,
  ACTIVE_NOTE_ACTION_PLANNER_SYSTEM_PROMPT,
  ACTIVE_NOTE_PROJECT_DESTINATION_PROMPT_VERSION,
  ACTIVE_NOTE_PROJECT_DESTINATION_SYSTEM_PROMPT,
  ACTIVE_NOTE_PROJECT_FIT_PROMPT_VERSION,
  ACTIVE_NOTE_PROJECT_FIT_SYSTEM_PROMPT,
  ACTIVE_NOTE_PROJECT_RESOLVER_PROMPT_VERSION,
  ACTIVE_NOTE_PROJECT_RESOLVER_SYSTEM_PROMPT,
  ACTIVE_NOTE_PROMPT_VERSION,
  ACTIVE_NOTE_SEGMENTATION_SYSTEM_PROMPT,
  ActiveNoteAIProviderBase,
  ActiveNoteAnalysisError,
  buildProjectDestinationUserInput,
  buildProjectFitUserInput,
  buildProjectResolverUserInput,
  buildSegmentActionPlannerUserInput,
  inferSegmentProjectAssignmentsFromFitEvaluations,
  parseActiveNoteSegmentationOutput,
  parseProjectDestinationOutput,
  parseProjectFitEvaluationOutput,
  parseProjectResolverOutput,
  parseSegmentActionPlanOutput,
  type ActiveNoteAIInput,
  type ActiveNoteProjectAssignment,
  type ActiveNoteProjectAssignmentResult,
  type ActiveNoteProjectContextResult,
  type ActiveNoteSegmentationResult,
  type PlanSegmentActionInput,
  type ProjectAssignmentCandidate,
  type ProjectFitEvaluation,
  type SegmentActionPlan,
  type SegmentWithProjectMatches,
} from "../../domain/active-notes/index.js";
import { generateEmbedding } from "./generate-embedding.js";
import { ACTIVE_NOTE_ACTION_PLANNER_RESPONSE_SCHEMA } from "./active-note-action-planner-response-schema.js";
import {
  ACTIVE_NOTE_PROJECT_DESTINATION_RESPONSE_SCHEMA,
  ACTIVE_NOTE_PROJECT_FIT_RESPONSE_SCHEMA,
} from "./active-note-project-fit-response-schema.js";
import { ACTIVE_NOTE_PROJECT_RESOLVER_RESPONSE_SCHEMA } from "./active-note-project-resolver-response-schema.js";
import { ACTIVE_NOTE_SEGMENTATION_RESPONSE_SCHEMA } from "./active-note-response-schema.js";

export interface OpenAIActiveNoteProviderOptions {
  apiKey?: string;
  model?: string;
  client?: OpenAI;
  generateEmbedding?: (text: string) => Promise<number[]>;
}

type StructuredResponseSchema = {
  name: string;
  strict?: boolean;
  schema: Record<string, unknown>;
};

export class OpenAIActiveNoteProvider extends ActiveNoteAIProviderBase {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(options: OpenAIActiveNoteProviderOptions = {}) {
    const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
    if (!options.client && !apiKey) {
      throw new ActiveNoteAnalysisError(
        "OPENAI_API_KEY is not configured",
        500
      );
    }

    const client =
      options.client ??
      new OpenAI({
        apiKey,
      });

    super({
      generateEmbedding:
        options.generateEmbedding ??
        ((text) => generateEmbedding(text, { client })),
    });

    this.client = client;
    this.model =
      options.model ??
      (process.env.OPENAI_ACTIVE_NOTE_MODEL?.trim() || "gpt-5-mini");
  }

  async segment(input: ActiveNoteAIInput): Promise<ActiveNoteSegmentationResult> {
    return this.runAnalysisStep(
      ACTIVE_NOTE_PROMPT_VERSION,
      "segmentation",
      async () => {
        const parsedJson = await this.runJsonSchemaPrompt({
          systemPrompt: ACTIVE_NOTE_SEGMENTATION_SYSTEM_PROMPT,
          userContent: input.content,
          jsonSchema: ACTIVE_NOTE_SEGMENTATION_RESPONSE_SCHEMA,
        });
        return parseActiveNoteSegmentationOutput(parsedJson);
      }
    );
  }

  async inferProjectAssignment(
    result: ActiveNoteProjectContextResult
  ): Promise<ActiveNoteProjectAssignmentResult> {
    return this.runAnalysisStep(
      ACTIVE_NOTE_PROJECT_FIT_PROMPT_VERSION,
      "project assignment",
      async () => {
        const embeddedSegments =
          await inferSegmentProjectAssignmentsFromFitEvaluations(
            result.embeddedSegments,
            {
              evaluateProjectFit: (segment, candidate) =>
                this.evaluateProjectFit(segment, candidate),
              resolveProjectMatch: (segment, evaluations) =>
                this.resolveProjectMatch(segment, evaluations),
              classifyUnassignedDestination: (segment) =>
                this.classifyUnassignedDestination(segment),
            }
          );
        return { embeddedSegments };
      }
    );
  }

  private async evaluateProjectFit(
    segment: SegmentWithProjectMatches,
    candidate: ProjectAssignmentCandidate
  ): Promise<ProjectFitEvaluation> {
    const parsedJson = await this.runJsonSchemaPrompt({
      systemPrompt: ACTIVE_NOTE_PROJECT_FIT_SYSTEM_PROMPT,
      userContent: buildProjectFitUserInput(segment, candidate),
      jsonSchema: ACTIVE_NOTE_PROJECT_FIT_RESPONSE_SCHEMA,
    });

    return parseProjectFitEvaluationOutput(parsedJson, candidate, {
      sourceText: segment.sourceText,
      contextualText: segment.contextualText,
    });
  }

  private async classifyUnassignedDestination(
    segment: SegmentWithProjectMatches
  ): Promise<ActiveNoteProjectAssignment> {
    const parsedJson = await this.runJsonSchemaPrompt({
      systemPrompt: ACTIVE_NOTE_PROJECT_DESTINATION_SYSTEM_PROMPT,
      userContent: buildProjectDestinationUserInput(segment),
      jsonSchema: ACTIVE_NOTE_PROJECT_DESTINATION_RESPONSE_SCHEMA,
    });

    return parseProjectDestinationOutput(parsedJson, segment);
  }

  private async resolveProjectMatch(
    segment: SegmentWithProjectMatches,
    qualifiedEvaluations: ProjectFitEvaluation[]
  ): Promise<import("../../domain/active-notes/index.js").ProjectResolutionResult> {
    const parsedJson = await this.runJsonSchemaPrompt({
      systemPrompt: ACTIVE_NOTE_PROJECT_RESOLVER_SYSTEM_PROMPT,
      userContent: buildProjectResolverUserInput(segment, qualifiedEvaluations),
      jsonSchema: ACTIVE_NOTE_PROJECT_RESOLVER_RESPONSE_SCHEMA,
    });

    return parseProjectResolverOutput(parsedJson, qualifiedEvaluations);
  }

  async planSegmentAction(
    input: PlanSegmentActionInput
  ): Promise<SegmentActionPlan> {
    return this.runAnalysisStep(
      ACTIVE_NOTE_ACTION_PLANNER_PROMPT_VERSION,
      "action planner",
      async () => {
        const parsedJson = await this.runJsonSchemaPrompt({
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

  private async runJsonSchemaPrompt(options: {
    systemPrompt: string;
    userContent: string;
    jsonSchema: StructuredResponseSchema;
  }): Promise<unknown> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      ...(modelSupportsCustomTemperature(this.model)
        ? { temperature: 0.2 }
        : {}),
      response_format: {
        type: "json_schema",
        json_schema: options.jsonSchema,
      },
      messages: [
        { role: "system", content: options.systemPrompt },
        { role: "user", content: options.userContent },
      ],
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new ActiveNoteAnalysisError(
        "AI provider returned an empty response"
      );
    }

    try {
      return JSON.parse(content);
    } catch {
      throw new ActiveNoteAnalysisError("AI provider returned invalid JSON");
    }
  }

  private async runAnalysisStep<T>(
    promptVersion: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof ActiveNoteAnalysisError) {
        throw error;
      }

      console.error(
        `[${promptVersion}] Active note ${operation} provider failure`,
        error
      );
      throw new ActiveNoteAnalysisError(
        "Active note analysis failed. Please try again."
      );
    }
  }
}

/** GPT-5 and o-series reasoning models only accept the default temperature (1). */
function modelSupportsCustomTemperature(model: string): boolean {
  const id = model.toLowerCase();
  return !id.startsWith("gpt-5") && !/^o[1-9]/.test(id);
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

export function createActiveNoteAIProvider(): OpenAIActiveNoteProvider {
  return new OpenAIActiveNoteProvider();
}
