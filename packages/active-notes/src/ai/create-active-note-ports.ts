import OpenAI from "openai";
import { ActiveNoteAnalysisError } from "../domain/index.js";
import type { AnalyzeActiveNotePorts } from "../domain/index.js";
import { PostgresProjectSearchAdapter } from "../persistence/postgres-project-search.adapter.js";
import { PostgresProjectActionContextAdapter } from "../persistence/postgres-project-action-context.adapter.js";
import { OpenAIJsonClient } from "./openai-json-client.js";
import { OpenAIEmbeddingAdapter } from "./embedding/openai-embedding.js";
import { StubEmbeddingAdapter } from "./embedding/stub-embedding.js";
import { OpenAIActiveNoteSegmenter } from "./segmenter/openai-segmenter.js";
import { StubActiveNoteSegmenter } from "./segmenter/stub-segmenter.js";
import { ACTIVE_NOTE_PROMPT_VERSION } from "./segmenter/prompt.js";
import { OpenAIProjectAssignmentAdapter } from "./assignment/openai-project-assignment.js";
import { stubProjectAssignmentPort } from "./assignment/stub-project-assignment.js";
import { OpenAISegmentActionPlanner } from "./action-planner/openai-action-planner.js";
import { StubSegmentActionPlanner } from "./action-planner/stub-action-planner.js";

export interface ActiveNotePortBundle extends AnalyzeActiveNotePorts {
  promptVersion: string;
  providerName: "openai" | "stub";
}

function createOpenAIPorts(): AnalyzeActiveNotePorts {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new ActiveNoteAnalysisError("OPENAI_API_KEY is not configured", 500);
  }

  const client = new OpenAI({ apiKey });
  const model =
    process.env.OPENAI_ACTIVE_NOTE_MODEL?.trim() || "gpt-5-mini";
  const jsonClient = new OpenAIJsonClient(client, model);

  return {
    embedding: new OpenAIEmbeddingAdapter(client),
    projectSearch: new PostgresProjectSearchAdapter(),
    projectActionContext: new PostgresProjectActionContextAdapter(),
    segmenter: new OpenAIActiveNoteSegmenter(jsonClient),
    projectAssignment: new OpenAIProjectAssignmentAdapter(jsonClient),
    actionPlanner: new OpenAISegmentActionPlanner(jsonClient),
  };
}

function createStubPorts(): AnalyzeActiveNotePorts {
  return {
    embedding: new StubEmbeddingAdapter(),
    projectSearch: new PostgresProjectSearchAdapter(),
    projectActionContext: new PostgresProjectActionContextAdapter(),
    segmenter: new StubActiveNoteSegmenter(),
    projectAssignment: stubProjectAssignmentPort,
    actionPlanner: new StubSegmentActionPlanner(),
  };
}

export function createActiveNotePorts(): ActiveNotePortBundle {
  if (process.env.OPENAI_API_KEY?.trim()) {
    try {
      const ports = createOpenAIPorts();
      const model =
        process.env.OPENAI_ACTIVE_NOTE_MODEL?.trim() || "gpt-5-mini";
      console.log(`[active-note] Using OpenAI provider (model=${model}).`);
      return {
        ...ports,
        promptVersion: ACTIVE_NOTE_PROMPT_VERSION,
        providerName: "openai",
      };
    } catch (error) {
      console.warn(
        "[active-note] OpenAI provider failed to initialize; using stub.",
        error
      );
    }
  } else {
    console.warn(
      "[active-note] OPENAI_API_KEY not set; using stub Active Note AI provider."
    );
  }

  return {
    ...createStubPorts(),
    promptVersion: ACTIVE_NOTE_PROMPT_VERSION,
    providerName: "stub",
  };
}
