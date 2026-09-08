import type {
  ActiveNoteProjectAssignment,
  IProjectAssignmentPort,
  ProjectAssignmentCandidate,
  ProjectFitEvaluation,
  ProjectResolutionResult,
  SegmentWithProjectMatches,
} from "../../domain/index.js";
import { ACTIVE_NOTE_PROJECT_FIT_RESPONSE_SCHEMA } from "./fit/json-schema.js";
import { ACTIVE_NOTE_PROJECT_DESTINATION_RESPONSE_SCHEMA } from "./destination/json-schema.js";
import { ACTIVE_NOTE_PROJECT_RESOLVER_RESPONSE_SCHEMA } from "./resolver/json-schema.js";
import {
  ACTIVE_NOTE_PROJECT_DESTINATION_PROMPT_VERSION,
  ACTIVE_NOTE_PROJECT_DESTINATION_SYSTEM_PROMPT,
} from "./destination/prompt.js";
import {
  ACTIVE_NOTE_PROJECT_FIT_PROMPT_VERSION,
  ACTIVE_NOTE_PROJECT_FIT_SYSTEM_PROMPT,
} from "./fit/prompt.js";
import {
  ACTIVE_NOTE_PROJECT_RESOLVER_PROMPT_VERSION,
  ACTIVE_NOTE_PROJECT_RESOLVER_SYSTEM_PROMPT,
} from "./resolver/prompt.js";
import { buildProjectFitUserInput } from "./fit/build-prompt-input.js";
import { buildProjectDestinationUserInput } from "./destination/build-prompt-input.js";
import { buildProjectResolverUserInput } from "./resolver/build-prompt-input.js";
import { parseProjectDestinationOutput } from "./destination/parse.js";
import { parseProjectFitEvaluationOutput } from "./fit/parse.js";
import { parseProjectResolverOutput } from "./resolver/parse.js";
import type { OpenAIJsonClient } from "../openai-json-client.js";

export class OpenAIProjectAssignmentAdapter implements IProjectAssignmentPort {
  constructor(private readonly client: OpenAIJsonClient) {}

  async evaluateFit(
    segment: SegmentWithProjectMatches,
    candidate: ProjectAssignmentCandidate
  ): Promise<ProjectFitEvaluation> {
    return this.client.runAnalysisStep(
      ACTIVE_NOTE_PROJECT_FIT_PROMPT_VERSION,
      "project fit",
      async () => {
        const parsedJson = await this.client.runJsonSchemaPrompt({
          systemPrompt: ACTIVE_NOTE_PROJECT_FIT_SYSTEM_PROMPT,
          userContent: buildProjectFitUserInput(segment, candidate),
          jsonSchema: ACTIVE_NOTE_PROJECT_FIT_RESPONSE_SCHEMA,
        });

        return parseProjectFitEvaluationOutput(parsedJson, candidate, {
          sourceText: segment.sourceText,
          contextualText: segment.contextualText,
        });
      }
    );
  }

  async resolveMatch(
    segment: SegmentWithProjectMatches,
    qualifiedEvaluations: ProjectFitEvaluation[]
  ): Promise<ProjectResolutionResult> {
    return this.client.runAnalysisStep(
      ACTIVE_NOTE_PROJECT_RESOLVER_PROMPT_VERSION,
      "project resolver",
      async () => {
        const parsedJson = await this.client.runJsonSchemaPrompt({
          systemPrompt: ACTIVE_NOTE_PROJECT_RESOLVER_SYSTEM_PROMPT,
          userContent: buildProjectResolverUserInput(
            segment,
            qualifiedEvaluations
          ),
          jsonSchema: ACTIVE_NOTE_PROJECT_RESOLVER_RESPONSE_SCHEMA,
        });

        return parseProjectResolverOutput(parsedJson, qualifiedEvaluations);
      }
    );
  }

  async classifyUnassigned(
    segment: SegmentWithProjectMatches
  ): Promise<ActiveNoteProjectAssignment> {
    return this.client.runAnalysisStep(
      ACTIVE_NOTE_PROJECT_DESTINATION_PROMPT_VERSION,
      "project destination",
      async () => {
        const parsedJson = await this.client.runJsonSchemaPrompt({
          systemPrompt: ACTIVE_NOTE_PROJECT_DESTINATION_SYSTEM_PROMPT,
          userContent: buildProjectDestinationUserInput(segment),
          jsonSchema: ACTIVE_NOTE_PROJECT_DESTINATION_RESPONSE_SCHEMA,
        });

        return parseProjectDestinationOutput(parsedJson, segment);
      }
    );
  }
}
