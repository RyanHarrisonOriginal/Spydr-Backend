/**
 * Throwaway: run the full Active Note analyze pipeline and write JSON per step.
 *
 * Pipeline: segmentation → embeddings → semantic retrieval → project assignment → action planning
 *
 * Usage (from monorepo root):
 *   npx tsx apps/api/scripts/debug-active-note-analyze.ts
 *   npx tsx apps/api/scripts/debug-active-note-analyze.ts --org-id=<uuid> --user-id=<clerk-user-id>
 *   npx tsx apps/api/scripts/debug-active-note-analyze.ts --output-dir=./tmp/debug-run
 *
 * Writes step files under apps/api/scripts/debug-output/<timestamp>/ by default:
 *   00-input.json
 *   01-segmentation.json
 *   02-embeddings.json
 *   03-project-context.json
 *   04-project-assignment.json
 *   05-action-planning.json
 *   pipeline.json
 *
 * Env: OPENAI_API_KEY, DATABASE_URL (required for real semantic search)
 * Optional: ACTIVE_NOTE_TEST_ORG_ID, ACTIVE_NOTE_TEST_USER_ID
 * Note: if using gpt-5-mini, set OPENAI_ACTIVE_NOTE_MODEL=gpt-4o-mini (gpt-5-mini rejects temperature=0.2)
 */
import "@spydr/config";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { prisma, disconnectPrisma } from "@spydr/db";
import { createActiveNoteAIProvider } from "../src/infra/ai/openai-active-note-provider.js";
import type {
  ActiveNoteAIInput,
  ActiveNoteAIOutput,
  ActiveNoteEmbeddedSegmentationResult,
  ActiveNoteProjectAssignmentResult,
  ActiveNoteProjectContextResult,
  ActiveNoteSegmentationResult,
} from "../src/domain/active-notes/types/index.js";
import { extractProjectNameFromRetrievalDocument } from "../src/domain/active-notes/project-routing/helpers/build-project-candidate-input.js";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_OUTPUT_ROOT = path.join(SCRIPT_DIR, "debug-output");

const ACTIVE_NOTE = `Met with Amy today about the Commercial Scorecard rollout. 

She liked the overall direction but wants managers to have a clearer way to compare rep performance over time before we launch.

I need to add a rep-level trend view and validate the quarter-to-date calculations one more time before presenting the final version.

Eric mentioned the inventory app being built for the Southwest region is making good progress, but we still need to align with the Florida team so we don't end up with two different solutions solving the same problem.

I decided that querying Snowflake directly should remain our preferred fallback whenever the Power BI semantic models become too restrictive.

Maybe we should eventually create a reusable framework for internal SupplyOne applications so every new app follows the same authentication, security, and deployment patterns.`;

function parseArg(name: string): string | undefined {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match?.slice(prefix.length)?.trim() || undefined;
}

function createRunOutputDir(): string {
  const customDir = parseArg("output-dir");
  if (customDir) {
    return path.resolve(customDir);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(DEFAULT_OUTPUT_ROOT, timestamp);
}

async function resolveOrgContext(): Promise<{ orgId: string; userId: string }> {
  const orgId =
    parseArg("org-id") ??
    process.env.ACTIVE_NOTE_TEST_ORG_ID?.trim() ??
    undefined;
  const userId =
    parseArg("user-id") ??
    process.env.ACTIVE_NOTE_TEST_USER_ID?.trim() ??
    "debug-script-user";

  if (orgId) {
    return { orgId, userId };
  }

  const org = await prisma.organization.findFirst({
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });

  if (!org) {
    throw new Error(
      "No organization found. Pass --org-id=<uuid> or set ACTIVE_NOTE_TEST_ORG_ID."
    );
  }

  console.info(`[debug] Using first organization in DB: ${org.id}`);
  return { orgId: org.id, userId };
}

function summarizeEmbedding(embedding: number[]) {
  return {
    dimensions: embedding.length,
    preview: embedding.slice(0, 8),
  };
}

function formatSegmentationOutput(result: ActiveNoteSegmentationResult) {
  return {
    segmentCount: result.segments.length,
    segments: result.segments,
  };
}

function formatEmbeddingsOutput(result: ActiveNoteEmbeddedSegmentationResult) {
  return {
    segmentCount: result.embeddedSegments.length,
    segments: result.embeddedSegments.map((segment) => ({
      topic: segment.topic,
      sourceText: segment.sourceText,
      contextualText: segment.contextualText,
      embedding: summarizeEmbedding(segment.embedding),
    })),
  };
}

function formatProjectContextOutput(result: ActiveNoteProjectContextResult) {
  return {
    segmentCount: result.embeddedSegments.length,
    segments: result.embeddedSegments.map((segment) => ({
      topic: segment.topic,
      sourceText: segment.sourceText,
      contextualText: segment.contextualText,
      embedding: summarizeEmbedding(segment.embedding),
      retrievalCandidates: segment.projectMatches.map((match) => ({
        projectId: match.projectId,
        projectName:
          extractProjectNameFromRetrievalDocument(match.retrievalDocument) ??
          null,
        similarity: match.similarity,
        retrievalContext: match.retrievalDocument,
      })),
    })),
  };
}

function formatProjectAssignmentOutput(
  result: ActiveNoteProjectAssignmentResult
) {
  return {
    segmentCount: result.embeddedSegments.length,
    segments: result.embeddedSegments.map((segment) => ({
      topic: segment.topic,
      sourceText: segment.sourceText,
      contextualText: segment.contextualText,
      embedding: summarizeEmbedding(segment.embedding),
      retrievalCandidates: segment.projectMatches.map((match) => ({
        projectId: match.projectId,
        projectName:
          extractProjectNameFromRetrievalDocument(match.retrievalDocument) ??
          null,
        similarity: match.similarity,
        retrievalContext: match.retrievalDocument,
      })),
      projectAssignment: segment.projectAssignment,
    })),
  };
}

function formatActionPlanningOutput(result: ActiveNoteAIOutput) {
  return {
    segmentCount: result.segments.length,
    actionPlanCount: result.actionPlans.length,
    segments: result.segments,
    actionPlans: result.actionPlans,
  };
}

type PipelineSnapshot = {
  runAt: string;
  outputDir: string;
  input: ActiveNoteAIInput;
  steps: Record<string, unknown>;
};

async function writeStepFile(
  outputDir: string,
  filename: string,
  payload: unknown
): Promise<string> {
  const filePath = path.join(outputDir, filename);
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.info(`[debug] wrote ${filePath}`);
  return filePath;
}

async function main(): Promise<void> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is required for this script.");
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL is required for pgvector project search.");
  }

  const context = await resolveOrgContext();
  const provider = createActiveNoteAIProvider();
  const input: ActiveNoteAIInput = {
    content: ACTIVE_NOTE,
    orgId: context.orgId,
    userId: context.userId,
  };

  const outputDir = createRunOutputDir();
  await mkdir(outputDir, { recursive: true });

  const pipeline: PipelineSnapshot = {
    runAt: new Date().toISOString(),
    outputDir,
    input,
    steps: {},
  };

  console.info(`[debug] output directory: ${outputDir}`);
  console.info("[debug] running full analyze pipeline…");

  await writeStepFile(outputDir, "00-input.json", {
    runAt: pipeline.runAt,
    input,
  });

  const segmented = await provider.segment(input);
  pipeline.steps.segmentation = formatSegmentationOutput(segmented);
  await writeStepFile(
    outputDir,
    "01-segmentation.json",
    pipeline.steps.segmentation
  );

  const embedded = await provider.embedSegments(segmented);
  pipeline.steps.embeddings = formatEmbeddingsOutput(embedded);
  await writeStepFile(
    outputDir,
    "02-embeddings.json",
    pipeline.steps.embeddings
  );

  const withContext = await provider.getProjectContext(embedded, context);
  pipeline.steps.projectContext = formatProjectContextOutput(withContext);
  await writeStepFile(
    outputDir,
    "03-project-context.json",
    pipeline.steps.projectContext
  );

  const withAssignment = await provider.inferProjectAssignment(withContext);
  pipeline.steps.projectAssignment = formatProjectAssignmentOutput(withAssignment);
  await writeStepFile(
    outputDir,
    "04-project-assignment.json",
    pipeline.steps.projectAssignment
  );

  const finalOutput = await provider.inferAction(withAssignment);
  pipeline.steps.actionPlanning = formatActionPlanningOutput(finalOutput);
  await writeStepFile(
    outputDir,
    "05-action-planning.json",
    pipeline.steps.actionPlanning
  );

  await writeStepFile(outputDir, "pipeline.json", pipeline);

  console.info(
    `[debug] completed ${withAssignment.embeddedSegments.length} segment(s), ${finalOutput.actionPlans.length} action plan(s)`
  );
}

main()
  .catch((error) => {
    console.error("[debug] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
