import "@spydr/config";

import { SpydrNodeType as NodeType } from "@prisma/client";
import { disconnectPrisma, prisma } from "@spydr/db";
import { stopPgBoss } from "@spydr/config";
import { enqueueProjectEmbedding } from "../producers/embedding.producer.js";
import { embeddingService } from "../services/embedding.service.js";

interface ScriptOptions {
  dryRun: boolean;
  enqueue: boolean;
  skipExisting: boolean;
  concurrency: number;
}

function parseArgs(argv: readonly string[]): ScriptOptions {
  let dryRun = false;
  let enqueue = false;
  let skipExisting = false;
  let concurrency = 3;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg === "--enqueue") {
      enqueue = true;
      continue;
    }

    if (arg === "--skip-existing") {
      skipExisting = true;
      continue;
    }

    if (arg.startsWith("--concurrency=")) {
      const parsed = Number(arg.slice("--concurrency=".length));
      if (Number.isFinite(parsed) && parsed >= 1) {
        concurrency = Math.floor(parsed);
      }
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { dryRun, enqueue, skipExisting, concurrency };
}

function printUsage(): void {
  console.info(`Usage: npm run backfill:embeddings -- [options]

One-time backfill of project retrieval embeddings for all active projects.

Options:
  --dry-run            List project count/ids only; do not embed or enqueue
  --enqueue            Enqueue pg-boss jobs instead of embedding inline
                       (requires DATABASE_URL and a running embedding worker)
  --skip-existing      Skip projects that already have a retrieval context row
  --concurrency=N      Direct mode only; parallel embeds (default: 3)
  -h, --help           Show this help
`);
}

async function findProjectIdsToEmbed(skipExisting: boolean): Promise<string[]> {
  if (!skipExisting) {
    const projects = await prisma.spydrNode.findMany({
      where: {
        nodeType: NodeType.project,
        isDeleted: false,
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    return projects.map((project) => project.id);
  }

  const rows = await prisma.$queryRaw<Array<{ project_id: string }>>`
    SELECT n.id AS project_id
    FROM spydr_nodes n
    LEFT JOIN spydr_active_note_project_retrieval_context c
      ON c.project_id = n.id
    WHERE n.node_type = 'project'
      AND n.is_deleted = false
      AND c.project_id IS NULL
    ORDER BY n.created_at ASC
  `;

  return rows.map((row) => row.project_id);
}

async function runWithConcurrency<T>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  let nextIndex = 0;

  async function runWorker(): Promise<void> {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      await worker(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
}

async function embedDirectly(
  projectIds: readonly string[],
  concurrency: number
): Promise<{ succeeded: number; failed: number }> {
  let succeeded = 0;
  let failed = 0;

  await runWithConcurrency(projectIds, concurrency, async (projectId, index) => {
    const label = `[${index + 1}/${projectIds.length}] projectId=${projectId}`;

    try {
      await embeddingService.refreshProjectEmbedding(projectId);
      succeeded += 1;
      console.info(`${label} done`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${label} failed: ${message}`);
    }
  });

  return { succeeded, failed };
}

async function enqueueAll(projectIds: readonly string[]): Promise<void> {
  for (const [index, projectId] of projectIds.entries()) {
    await enqueueProjectEmbedding(projectId);
    console.info(
      `[${index + 1}/${projectIds.length}] enqueued projectId=${projectId}`
    );
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const projectIds = await findProjectIdsToEmbed(options.skipExisting);

  console.info(
    `[backfill] found ${projectIds.length} project(s)` +
      (options.skipExisting ? " without existing retrieval context" : "")
  );

  if (projectIds.length === 0) {
    return;
  }

  if (options.dryRun) {
    console.info("[backfill] dry run — project ids:");
    for (const projectId of projectIds) {
      console.info(`  ${projectId}`);
    }
    return;
  }

  if (options.enqueue) {
    await enqueueAll(projectIds);
    console.info(
      `[backfill] enqueued ${projectIds.length} job(s); ensure the embedding worker is running`
    );
    return;
  }

  console.info(
    `[backfill] embedding directly with concurrency=${options.concurrency}`
  );

  const result = await embedDirectly(projectIds, options.concurrency);

  console.info(
    `[backfill] complete (succeeded=${result.succeeded}, failed=${result.failed})`
  );

  if (result.failed > 0) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error("[backfill] fatal error", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await stopPgBoss();
    await disconnectPrisma();
  });
